/** Completion-prefetch coordinator. Only an already-authorized provider may
 * register a scope: neither a notification nor a locked/headless launch opens
 * credentials or starts a route. No native imports in this module.
 *
 * Attention warming is deliberately NOT implemented: the push's opaque computer
 * handle cannot currently be mapped to a route (see docs/completion-prefetch.md).
 * A completion is different: resolving its opaque conversation handle on the
 * selected authenticated relay proves that relay offers it; a 404 has no fallback. */
export interface WarmSyncScope {
	isActive(): boolean;
	seed(sessionId: string, signal: AbortSignal): Promise<boolean>;
	resolve(handle: string, signal: AbortSignal): Promise<string>;
}

export function createWarmSync(now: () => number = Date.now) {
	let scope: WarmSyncScope | null = null;
	const views = new Set<{ sessionId: string }>();
	const seeds = new Map<
		string,
		{ promise: Promise<boolean>; controller: AbortController }
	>();
	const successful = new Map<string, number>();
	const controllers = new Set<AbortController>();

	// One deadline includes resolution, the first-frame read and cache save.
	// Abort also settles a non-cooperative adapter; adapters fence eventual writes.
	const bounded = (
		work: (signal: AbortSignal) => Promise<boolean>,
		ms: number,
		parent?: AbortSignal,
	) => {
		const controller = new AbortController();
		controllers.add(controller);
		const abort = () => controller.abort();
		parent?.addEventListener("abort", abort, { once: true });
		let timer: ReturnType<typeof setTimeout> | undefined;
		const promise = (async () => {
			const cancelled = new Promise<boolean>((resolve) => {
				controller.signal.addEventListener("abort", () => resolve(false), {
					once: true,
				});
				timer = setTimeout(abort, Math.max(0, ms));
			});
			if (parent?.aborted) abort();
			try {
				return await Promise.race([
					Promise.resolve()
						.then(() =>
							controller.signal.aborted ? false : work(controller.signal),
						)
						.catch(() => false),
					cancelled,
				]);
			} finally {
				clearTimeout(timer);
				parent?.removeEventListener("abort", abort);
				abort();
				controllers.delete(controller);
			}
		})();
		return { promise, controller };
	};
	const prefetch = (
		sessionId: string,
		budgetMs = 25_000,
		parent?: AbortSignal,
	): Promise<boolean> => {
		const owner = scope;
		if (
			!owner?.isActive() ||
			[...views].some((view) => view.sessionId === sessionId)
		)
			return Promise.resolve(false);
		const existing = seeds.get(sessionId);
		if (existing) return existing.promise;
		// A burst and its received/tapped copies share one successful seed/minute.
		if (now() - (successful.get(sessionId) ?? -Infinity) < 60_000)
			return Promise.resolve(false);
		const task = bounded(
			async (signal) => {
				const saved = await owner.seed(sessionId, signal);
				if (saved && !signal.aborted && scope === owner && owner.isActive()) {
					successful.set(sessionId, now());
					return true;
				}
				return false;
			},
			budgetMs,
			parent,
		);
		seeds.set(sessionId, task);
		void task.promise.finally(() => {
			if (seeds.get(sessionId) === task) seeds.delete(sessionId);
		});
		return task.promise;
	};
	const retire = () => {
		for (const controller of controllers) controller.abort();
		seeds.clear();
		successful.clear();
	};
	return {
		register(next: WarmSyncScope) {
			retire();
			scope = next;
			return () => {
				if (scope === next) {
					scope = null;
					retire();
				}
			};
		},
		/** The screen takes ownership BEFORE opening its own stream. View tokens
		 * survive a same-route reconnect, and each cleanup removes only its token. */
		view(sessionId: string) {
			const view = { sessionId };
			views.add(view);
			seeds.get(sessionId)?.controller.abort();
			return () => {
				views.delete(view);
			};
		},
		prefetch,
		received(handle: string): Promise<boolean> {
			const owner = scope;
			if (!owner?.isActive()) return Promise.resolve(false);
			const deadline = now() + 25_000;
			return bounded(async (signal) => {
				const id = await owner.resolve(handle, signal);
				if (signal.aborted || scope !== owner || !owner.isActive())
					return false;
				return prefetch(id, Math.max(0, deadline - now()), signal);
			}, 25_000).promise;
		},
	};
}

export const warmSync = createWarmSync();

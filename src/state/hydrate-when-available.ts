/**
 * Read a stored preference, and if the read FAILS, try again the next time the
 * app becomes active — never fall back to the default as though it were stored.
 *
 * WHY. iOS launches the app in the background on a locked phone (a TestFlight
 * update, a silent push, background fetch) and protected data may not be
 * readable then. The theme and sidebar stores used to treat a failed read as
 * "nothing stored": they hydrated the DEFAULT, marked themselves hydrated, and
 * the next write — the theme's persist effect, a sidebar tap — stored that
 * default over the reader's choice. A failed read now leaves the store
 * unhydrated (so nothing writes) and retries on the next `active`, when the
 * phone is necessarily unlocked.
 *
 * Pure: `subscribeActive` is injected (the app binds it to `AppState`), so this
 * runs in Node.
 *
 * Returns a cancel function for the effect cleanup.
 */
export function hydrateWhenAvailable<T>(deps: {
	read: () => Promise<T>;
	onValue: (value: T) => void;
	/** Calls `listener` on every transition to `active`; returns unsubscribe. */
	subscribeActive: (listener: () => void) => () => void;
}): () => void {
	let cancelled = false;
	let unsubscribe: (() => void) | null = null;
	let reading = false;
	const attempt = () => {
		if (cancelled || reading) return;
		reading = true;
		deps.read().then(
			(value) => {
				reading = false;
				if (cancelled) return;
				unsubscribe?.();
				unsubscribe = null;
				deps.onValue(value);
			},
			() => {
				reading = false;
				if (cancelled || unsubscribe) return;
				unsubscribe = deps.subscribeActive(attempt);
			},
		);
	};
	attempt();
	return () => {
		cancelled = true;
		unsubscribe?.();
		unsubscribe = null;
	};
}

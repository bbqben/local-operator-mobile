/** Mount wiring for the iOS notification categories: the tap router's mount
 * registers them, a language change re-registers them, and neither an
 * unrelated re-render nor a language change touches the tap/received
 * listeners or the Android channel setup.
 *
 * Same minimal React-shaped runtime as `use-session-push-registration.test.ts`
 * (no React renderer in this repo's Node tests, ADR 0003): effects re-run only
 * when a dep changes by `Object.is`, cleanups run before a re-run and on
 * unmount. `categories.ts` and its call into `expo-notifications` run for real;
 * the listener seams in `native.ts` and the sibling hooks are stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => {
	type Slot = { deps?: readonly unknown[]; cleanup?: (() => void) | undefined };
	let slots: Slot[] = [];
	let index = 0;
	let current:
		| ((effect: () => (() => void) | undefined, deps?: unknown[]) => void)
		| null = null;
	const changed = (prev: readonly unknown[] | undefined, next?: unknown[]) =>
		prev === undefined ||
		next === undefined ||
		prev.length !== next.length ||
		next.some((dep, i) => !Object.is(dep, prev[i]));
	return {
		render(component: () => void): void {
			index = 0;
			const queued: (() => void)[] = [];
			current = (effect, deps) => {
				const slot = slots[index++] ?? {};
				slots[index - 1] = slot;
				if (!changed(slot.deps, deps)) return;
				slot.deps = deps;
				queued.push(() => {
					slot.cleanup?.();
					slot.cleanup = effect() ?? undefined;
				});
			};
			try {
				component();
			} finally {
				current = null;
			}
			for (const run of queued) run();
		},
		unmount(): void {
			for (const slot of slots) slot.cleanup?.();
			slots = [];
		},
		useEffect(effect: () => (() => void) | undefined, deps?: unknown[]): void {
			if (current === null) throw new Error("useEffect outside render");
			current(effect, deps);
		},
	};
});

const seam = vi.hoisted(() => ({
	os: "ios",
	language: null as string | null,
	categoryCalls: [] as [string, Record<string, unknown> | undefined][],
	failAll: false,
	channels: 0,
	tapSubscribes: 0,
	tapTeardowns: 0,
	receivedSubscribes: 0,
	receivedTeardowns: 0,
	permissionRequests: 0,
}));

vi.mock("react", () => ({
	useEffect: (effect: () => (() => void) | undefined, deps?: unknown[]) =>
		hooks.useEffect(effect, deps),
}));
vi.mock("react-native", () => ({
	Platform: {
		get OS() {
			return seam.os;
		},
	},
}));
vi.mock("expo-notifications", () => ({
	setNotificationCategoryAsync: async (
		id: string,
		_actions: unknown[],
		options?: Record<string, unknown>,
	) => {
		if (seam.failAll) throw new Error("synthetic failure");
		seam.categoryCalls.push([id, options]);
		return { identifier: id };
	},
	requestPermissionsAsync: async () => {
		seam.permissionRequests += 1;
		return { status: "granted" };
	},
}));
vi.mock("@/features/auth/connection-provider", () => ({
	useLocaleFrame: () => seam.language,
}));
vi.mock("@/notifications/native", async (original) => ({
	// The real lazy loader (it resolves the mocked module above); the listener
	// seams are counted so the test can prove they are not re-subscribed.
	loadNotifications: (await original<typeof import("@/notifications/native")>())
		.loadNotifications,
	ensureAndroidSoundChannels: async () => {
		seam.channels += 1;
	},
	subscribeConversationPushesReceived: async () => {
		seam.receivedSubscribes += 1;
		return () => {
			seam.receivedTeardowns += 1;
		};
	},
	subscribeNotificationTaps: async () => {
		seam.tapSubscribes += 1;
		return () => {
			seam.tapTeardowns += 1;
		};
	},
}));
vi.mock("@/features/deep-links/pending", () => ({
	noteConversationPush: () => {},
}));
vi.mock("@/state/warm-sync", () => ({
	warmSync: { received: async () => {} },
}));
vi.mock("./use-custom-sound-prefetch", () => ({
	useCustomSoundPrefetch: () => {},
}));
vi.mock("./use-session-push-registration", () => ({
	useSessionPushRegistration: () => {},
}));

const { useNotificationTapRouting } = await import(
	"@/notifications/use-notification-taps"
);
const { NOTIFICATION_CATEGORY_IDS } = await import(
	"@/notifications/categories"
);
const { resetLocaleSource, setLocaleSource } = await import("@/i18n");

/** Lets the chained async registration and listener subscriptions settle. */
const settle = async () => {
	for (let i = 0; i < 20; i += 1) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
};

const ids = () => seam.categoryCalls.map(([id]) => id);

beforeEach(() => {
	seam.os = "ios";
	seam.language = null;
	seam.categoryCalls.length = 0;
	seam.failAll = false;
	seam.channels = 0;
	seam.tapSubscribes = 0;
	seam.tapTeardowns = 0;
	seam.receivedSubscribes = 0;
	seam.receivedTeardowns = 0;
	seam.permissionRequests = 0;
	// The runtime reads the same value the frame subscription returns.
	setLocaleSource(() => seam.language);
});
afterEach(() => {
	hooks.unmount();
	resetLocaleSource();
});

describe("useNotificationTapRouting — categories", () => {
	it("registers the three categories once at mount, alongside the listeners", async () => {
		hooks.render(useNotificationTapRouting);
		await settle();
		expect(ids()).toEqual([...NOTIFICATION_CATEGORY_IDS]);
		expect(seam.tapSubscribes).toBe(1);
		expect(seam.receivedSubscribes).toBe(1);
		expect(seam.channels).toBe(1);
		expect(seam.permissionRequests).toBe(0);
	});

	it("does not re-register on a re-render with the same language", async () => {
		hooks.render(useNotificationTapRouting);
		hooks.render(useNotificationTapRouting);
		hooks.render(useNotificationTapRouting);
		await settle();
		expect(ids()).toEqual([...NOTIFICATION_CATEGORY_IDS]);
	});

	it("re-registers in the new language without re-subscribing the listeners", async () => {
		hooks.render(useNotificationTapRouting);
		await settle();
		seam.language = "ru";
		hooks.render(useNotificationTapRouting);
		await settle();
		expect(ids()).toEqual([
			...NOTIFICATION_CATEGORY_IDS,
			...NOTIFICATION_CATEGORY_IDS,
		]);
		expect(seam.categoryCalls[3]?.[1]).toEqual({
			categorySummaryFormat: "Ещё %u от ваших агентов",
			previewPlaceholder: "Обновление агента",
		});
		expect(seam.tapSubscribes).toBe(1);
		expect(seam.tapTeardowns).toBe(0);
		expect(seam.receivedSubscribes).toBe(1);
		expect(seam.channels).toBe(1);
	});

	it("keeps the listeners when every category call fails", async () => {
		seam.failAll = true;
		hooks.render(useNotificationTapRouting);
		await settle();
		expect(ids()).toEqual([]);
		expect(seam.tapSubscribes).toBe(1);
		expect(seam.receivedSubscribes).toBe(1);
	});

	it("does not register on Android (FCM carries no category)", async () => {
		seam.os = "android";
		hooks.render(useNotificationTapRouting);
		await settle();
		expect(ids()).toEqual([]);
		expect(seam.tapSubscribes).toBe(1);
	});

	it("tears the listeners down once on unmount, as before", async () => {
		hooks.render(useNotificationTapRouting);
		await settle();
		hooks.unmount();
		expect(seam.tapTeardowns).toBe(1);
		expect(seam.receivedTeardowns).toBe(1);
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The iOS notification categories (`categories.ts`).
 *
 * What is pinned, and why each one matters:
 *  1. the id set is EXACTLY the three `aps.category` ids the cloud sends — an
 *     id that drifts on either side falls back to iOS's generic summary
 *     silently, so this literal set is the app half of the cross-repo pin;
 *  2. each id is registered through the real `setNotificationCategoryAsync`
 *     with no actions and only the two copy options — no `showTitle` /
 *     `showSubtitle`, which would leak the session name past hidden previews;
 *  3. every shipped locale keeps exactly one `%u` in each summary and none in
 *     the placeholders (iOS formats the summary itself; a lost `%u` drops the
 *     count, a stray `%@` has no argument since `summary-arg` is unused);
 *  4. registration is iOS-only, never asks for permission, isolates a failing
 *     category, never rejects, and serialises runs so the latest language wins.
 */

const platform = vi.hoisted(() => ({ OS: "ios" as string }));
vi.mock("react-native", () => ({ Platform: platform }));

type CategoryCall = [string, unknown[], Record<string, unknown> | undefined];
const native = vi.hoisted(() => ({
	calls: [] as CategoryCall[],
	failId: null as string | null,
	/** When set, each call waits on this before recording (an in-flight run). */
	gate: null as Promise<void> | null,
	permissionRequests: 0,
}));

vi.mock("expo-notifications", () => ({
	setNotificationCategoryAsync: async (
		id: string,
		actions: unknown[],
		options?: Record<string, unknown>,
	) => {
		if (native.gate !== null) await native.gate;
		if (id === native.failId) throw new Error("synthetic failure");
		native.calls.push([id, actions, options]);
		return { identifier: id, actions, options };
	},
	requestPermissionsAsync: async () => {
		native.permissionRequests += 1;
		return { status: "granted" };
	},
}));

const {
	ensureNotificationCategories,
	NOTIFICATION_CATEGORY_IDS,
	notificationCategorySpecs,
} = await import("@/notifications/categories");
const {
	ENGLISH_MESSAGES,
	LOCALISED_MESSAGES,
	resetLocaleSource,
	setLocaleSource,
} = await import("@/i18n");

/** Characters expo-notifications warns break a category id. */
const EXPO_FORBIDDEN_ID_CHARS = /[:-]/;
/** Any printf-style conversion iOS would try to format. */
const FORMAT_SPECIFIER = /%./g;

const KEYS = [
	"completion_summary",
	"completion_placeholder",
	"digest_summary",
	"digest_placeholder",
	"message_summary",
	"message_placeholder",
].map((name) => `mobile.notifications.category.${name}`);

beforeEach(() => {
	native.calls.length = 0;
	native.failId = null;
	native.gate = null;
	native.permissionRequests = 0;
	platform.OS = "ios";
});
afterEach(resetLocaleSource);

describe("NOTIFICATION_CATEGORY_IDS", () => {
	it("is exactly the cloud's aps.category contract", () => {
		expect(new Set(NOTIFICATION_CATEGORY_IDS)).toEqual(
			new Set(["lo.completion", "lo.digest", "tb.message"]),
		);
		expect(NOTIFICATION_CATEGORY_IDS).toHaveLength(3);
	});

	it("uses no character expo warns breaks a category id", () => {
		// expo-notifications: "Don't use the characters `:` or `-`".
		for (const id of NOTIFICATION_CATEGORY_IDS)
			expect(id).not.toMatch(EXPO_FORBIDDEN_ID_CHARS);
	});
});

describe("notificationCategorySpecs", () => {
	it("renders English copy when no language frame has arrived", () => {
		expect(notificationCategorySpecs()).toEqual([
			{
				id: "lo.completion",
				categorySummaryFormat: "%u more from your agents",
				previewPlaceholder: "Agent update",
			},
			{
				id: "lo.digest",
				categorySummaryFormat: "%u more from your digest",
				previewPlaceholder: "Digest",
			},
			{
				id: "tb.message",
				categorySummaryFormat: "%u more from Team Bridge",
				previewPlaceholder: "Team Bridge message",
			},
		]);
	});

	it("follows the language at call time", () => {
		setLocaleSource(() => "fr");
		expect(notificationCategorySpecs()[0]?.categorySummaryFormat).toBe(
			"%u de plus de vos agents",
		);
	});

	it("keeps exactly one %u per summary and none per placeholder, in every locale", () => {
		const catalogues = {
			en: ENGLISH_MESSAGES,
			...LOCALISED_MESSAGES,
		} as Record<string, Record<string, string>>;
		expect(Object.keys(catalogues).sort()).toEqual(
			["en", "es", "fr", "hi", "ru", "ur", "vi", "zh-CN"].sort(),
		);
		for (const [locale, messages] of Object.entries(catalogues)) {
			for (const key of KEYS) {
				const text = messages[key];
				expect(text, `${locale} ${key}`).toBeTruthy();
				const specifiers = text?.match(FORMAT_SPECIFIER) ?? [];
				if (key.endsWith("_summary")) {
					expect(specifiers, `${locale} ${key}`).toEqual(["%u"]);
				} else {
					expect(specifiers, `${locale} ${key}`).toEqual([]);
				}
			}
		}
	});
});

describe("ensureNotificationCategories", () => {
	it("registers each contract id with no actions and only the copy options", async () => {
		await ensureNotificationCategories();
		expect(native.calls).toEqual(
			notificationCategorySpecs().map((spec) => [
				spec.id,
				[],
				{
					categorySummaryFormat: spec.categorySummaryFormat,
					previewPlaceholder: spec.previewPlaceholder,
				},
			]),
		);
		expect(native.calls.map(([id]) => id)).toEqual([
			...NOTIFICATION_CATEGORY_IDS,
		]);
		for (const [, , options] of native.calls) {
			expect(options).not.toHaveProperty("showTitle");
			expect(options).not.toHaveProperty("showSubtitle");
		}
	});

	it("never asks for notification permission", async () => {
		await ensureNotificationCategories();
		expect(native.permissionRequests).toBe(0);
	});

	it.each(["android", "web"])("is a no-op on %s", async (os) => {
		platform.OS = os;
		await ensureNotificationCategories();
		expect(native.calls).toEqual([]);
	});

	it("isolates a failing category and never rejects", async () => {
		native.failId = "lo.digest";
		await expect(ensureNotificationCategories()).resolves.toBeUndefined();
		expect(native.calls.map(([id]) => id)).toEqual([
			"lo.completion",
			"tb.message",
		]);
	});

	it("re-registers in the new language and the latest run lands last", async () => {
		let release!: () => void;
		native.gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const first = ensureNotificationCategories(); // English, held in flight
		setLocaleSource(() => "es");
		const second = ensureNotificationCategories();
		release();
		await Promise.all([first, second]);
		// Six calls, never interleaved: the whole English run, then Spanish.
		expect(native.calls.map(([id]) => id)).toEqual([
			...NOTIFICATION_CATEGORY_IDS,
			...NOTIFICATION_CATEGORY_IDS,
		]);
		expect(
			native.calls.slice(3).map(([, , o]) => o?.categorySummaryFormat),
		).toEqual([
			"%u más de tus agentes",
			"%u más de tu resumen",
			"%u más de Team Bridge",
		]);
	});
});

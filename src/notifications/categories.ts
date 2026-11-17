/**
 * iOS notification categories: the app half of the APNs `aps.category`
 * contract, registered so iOS can write a localized summary line under a
 * stacked group ("3 more from your agents") and a neutral placeholder when the
 * reader hides previews.
 *
 * WHY CATEGORIES AT ALL. Grouping is already per conversation: the cloud sets
 * `aps.thread-id` and that stays exactly as it is. What a thread-id cannot
 * carry is the stack's summary text — Apple makes that a property of the
 * CATEGORY (`UNNotificationCategory.categorySummaryFormat`), resolved by the OS
 * from the `aps.category` id on each push. The payload's `summary-arg` is
 * deprecated and ignored by iOS 15+, so nothing here or in the cloud sets it.
 *
 * THE IDS ARE A WIRE CONTRACT, NOT LABELS. The cloud (agent-server) writes one
 * of `NOTIFICATION_CATEGORY_IDS` into `aps.category`; the cloud owner confirmed
 * the mapping against the sender source:
 *   - `lo.completion` — a visible agent completion, including a held
 *     completion re-flushed later;
 *   - `lo.digest`     — a visible digest;
 *   - `tb.message`    — a visible Team Bridge message alert.
 * Background `content-available` pushes (attention, acknowledgement, badge
 * sync) carry NO category and are untouched; there is no mention category.
 * Renaming an id is therefore a compatibility event on both sides: a push that
 * names an id this build never registered is still delivered and still grouped
 * by its thread-id — iOS just has no summary format for it and falls back to
 * its own generic "N more notifications". That fallback is benign in both
 * directions (an old app meeting a new cloud id, a new app meeting an old cloud
 * that sends no category), which is why this can ship independently of the
 * cloud change, but it is silent — so the set is pinned by a test here and the
 * same literal set is pinned on the cloud side.
 *
 * PRIVACY. `previewPlaceholder` is what iOS shows INSTEAD of the body when the
 * reader has "Show Previews: Never / When Unlocked" on. It must never carry a
 * session name or message text — every placeholder is a fixed, generic noun
 * from the catalogue. No `showTitle` / `showSubtitle` either: those options
 * would surface the title (the session name since core #3990) while previews
 * are hidden, overriding the reader's choice.
 *
 * WHY iOS ONLY. Both options are iOS-only (`NotificationCategoryOptions`
 * is `@platform ios` in expo-notifications 57), Android pushes are data-only FCM
 * with no category (unchanged), and Android grouping needs native work that
 * waits for the Android launch. Registering there would write categories
 * nothing reads, so the call is skipped rather than made "for parity".
 *
 * NO ACTIONS. Each category is registered with an empty action list: this is a
 * summary-text change, not quick replies. The tap still opens the app through
 * the default action and the tap router (`use-notification-taps.ts`); the
 * notification identifier, thread, collapse id and badge are all unchanged, so
 * desktop-read clearing and the app-owned badge behave exactly as before.
 */

import { Platform } from "react-native";
import { type NoParamKey, t } from "@/i18n";
import { loadNotifications } from "@/notifications/native";

/** The `aps.category` ids the cloud may send. Frozen and ordered: this literal
 *  is the contract (see the module comment), compared as a set in the tests. */
export const NOTIFICATION_CATEGORY_IDS = [
	"lo.completion",
	"lo.digest",
	"tb.message",
] as const;

export type NotificationCategoryId = (typeof NOTIFICATION_CATEGORY_IDS)[number];

/* Keys per category, in a table rather than built from the id, so `tsc`
 * checks that every key exists and `check-strings` can see each one. */
const CATEGORY_COPY = {
	"lo.completion": {
		summary: "mobile.notifications.category.completion_summary",
		placeholder: "mobile.notifications.category.completion_placeholder",
	},
	"lo.digest": {
		summary: "mobile.notifications.category.digest_summary",
		placeholder: "mobile.notifications.category.digest_placeholder",
	},
	"tb.message": {
		summary: "mobile.notifications.category.message_summary",
		placeholder: "mobile.notifications.category.message_placeholder",
	},
} as const satisfies Record<
	NotificationCategoryId,
	{ summary: NoParamKey; placeholder: NoParamKey }
>;

export type NotificationCategorySpec = {
	id: NotificationCategoryId;
	/** iOS format string; `%u` is the count of OTHER notifications in the
	 *  stack. Phrased in the catalogue so the sentence agrees with any count
	 *  ("3 more from …"), because iOS plural rules would need a native
	 *  `.stringsdict` this app does not ship. */
	categorySummaryFormat: string;
	/** Fixed generic noun shown when previews are hidden. Never content. */
	previewPlaceholder: string;
};

/** The categories in the reader's CURRENT language. Read at call time (not at
 *  module load) so a language change re-registers with the new copy — the
 *  same rule as the Android channel names in `native.ts`. */
export const notificationCategorySpecs = (): NotificationCategorySpec[] =>
	NOTIFICATION_CATEGORY_IDS.map((id) => ({
		id,
		categorySummaryFormat: t(CATEGORY_COPY[id].summary),
		previewPlaceholder: t(CATEGORY_COPY[id].placeholder),
	}));

/* Runs are chained, never concurrent. expo's iOS `setCategory` is a
 * read-modify-write of the whole category set across an `await`
 * (`CategoryManager.swift`), so two overlapping calls can drop one another's
 * category, and two overlapping RUNS (a fast language change) could let an
 * older run's call land after the newer one and leave stale copy. Serialising
 * keeps "the last language wins" true. */
let chain: Promise<void> = Promise.resolve();

async function registerAll(): Promise<void> {
	const module = await loadNotifications();
	if (module === null) return;
	for (const spec of notificationCategorySpecs()) {
		try {
			await module.setNotificationCategoryAsync(spec.id, [], {
				categorySummaryFormat: spec.categorySummaryFormat,
				previewPlaceholder: spec.previewPlaceholder,
			});
		} catch {
			/* Operation-local: a category that cannot be set only costs its summary
			 * line (iOS falls back to its generic one). It must not touch auth,
			 * the permission prompt, the other categories or startup. */
		}
	}
}

/**
 * Registers the three categories with iOS. Safe to call at every start and on
 * every language change: setting an id that exists replaces it, and it never
 * asks for notification permission (categories need none). Never rejects.
 */
export function ensureNotificationCategories(): Promise<void> {
	if (Platform.OS !== "ios") return Promise.resolve();
	const run = chain.then(registerAll, registerAll);
	chain = run.catch(() => {});
	return chain;
}

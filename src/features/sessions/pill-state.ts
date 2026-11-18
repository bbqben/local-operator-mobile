import type { StreamHealth } from "@/features/auth/connection-provider";

/**
 * The list's connection pill state, from the stream's own status. A stale list
 * reads as degraded even while the socket looks open: what the reader has is old.
 *
 * Its own module (it was private to `conversations-pane.tsx`) so the provider
 * tests can assert what the pill RENDERS through a resume, not just the raw
 * health (PR #246 Q1-2: a "not degraded" assertion passed while the pill was a
 * red Offline). No React Native import, so a Node test can load it.
 *
 * `stopped` is whether the list loop has ENDED on a refusal the reader must act
 * on (the provider's `lastError`). A stopped loop's `offline` outranks `stale`:
 * a refusal softened for up to two minutes (`relay/refusal-grace.ts`) keeps the
 * loop retrying long enough for the stale mark to rise, and with `stale` first
 * the drawer then read a calm "Last updated 3 min ago." beside the conversation's
 * red refusal (local-operator-mobile PR #301 design D1). A RETRYING loop's
 * transient `offline` (a transport `closed` before `onError` repaints it
 * degraded) still reads as stale, so a reconnect never flashes the red pill.
 */
export function pillState(
	health: StreamHealth,
	stale: boolean,
	stopped = false,
): "connected" | "reconnecting" | "offline" | "degraded" {
	if (health === "offline" && stopped) return "offline";
	if (stale) return "degraded";
	if (health === "connecting") return "reconnecting";
	if (health === "offline") return "offline";
	if (health === "degraded") return "degraded";
	return "connected";
}

/**
 * Whether the pill is the one saying "Last updated …": only a stale `degraded`
 * pill carries the stale sentence; an `offline` pill says its own sentence.
 */
export function pillCarriesStaleNote(
	state: ReturnType<typeof pillState>,
	stale: boolean,
): boolean {
	return stale && state === "degraded";
}

/**
 * Whether the in-list "Last updated …" line renders. Not while the pill directly
 * above carries the same sentence at normal text size: the two repeated each
 * other, and the line's arrival was a second +28 px shift of the first row
 * (PR #301 design D2). At large text the pill tail-truncates its one line, so
 * the short age-only line (`staleShortNote`) is still where the age is
 * guaranteed visible, and it stays.
 */
export function showInListStale(input: {
	hasStaleMessage: boolean;
	pillCarriesStale: boolean;
	largeText: boolean;
}): boolean {
	if (!input.hasStaleMessage) return false;
	return input.largeText || !input.pillCarriesStale;
}

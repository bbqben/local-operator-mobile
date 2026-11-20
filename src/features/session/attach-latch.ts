import { launchingFromFallback } from "@/features/session/attach-handoff";

/**
 * An owner's "attaching" latch: busy from a pick's start until it settles,
 * with one escape for the pick that may never settle.
 *
 * WHAT IT GATES. `attaching` disables Attach, Paste and Clear draft, and the
 * web composer's Enter-to-send. It does NOT disable Send (`controls.primary`
 * reads no `attaching`), on any platform; that predates #248.
 *
 * WHY THE ESCAPE (#248, PR #328 QA round 1 Q2). A picker that UIKit refuses to
 * present never calls back, so its promise never settles and the owner's
 * `finally` never runs: Attach, Paste and Clear stayed disabled until the
 * composer remounted. The one launch that can be refused that way is the
 * attach handoff's FALLBACK — fired because the sheet's `onDismiss` had not
 * arrived, possibly before UIKit began the dismissal. So a pick that begins
 * inside a fallback launch (`launchingFromFallback`) is released after
 * `ATTACH_STRANDED_MS` if it has not settled.
 *
 * WHY ONLY THEN (review round 2 R6, QA Q3). A pick settles AFTER its picker
 * leaves the screen: expo-image-picker dismisses, then downloads an iCloud
 * original and re-encodes it; Files reads the file. Released during that
 * window, Clear, a second pick and web Enter ran against an image still in
 * flight. A pick launched from `onDismiss` (the normal path) or immediately
 * (Android, web) is never released early: it holds busy until it settles, as
 * before this PR. A fallback-launched pick that is merely slow can still be
 * released while it reads; that window is the cost of the escape, and it
 * exists only when `onDismiss` was lost or late.
 *
 * NO REAL "PRESENTED" SIGNAL. JavaScript cannot see the picker appear:
 * presenting it does not change `AppState`, and the module reports nothing
 * until it settles. Hence a timer.
 *
 * THE VALUE IS NOT MEASURED. It bounds how long a stranded Attach stays
 * disabled, and it is a floor on how long a reader may browse plus the read
 * before a fallback-launched pick is released. Three seconds is several times
 * a sheet-style presentation (~0.35 s) plus the picker module's first import;
 * the release trail in Copy diagnostics shows which picks fell back.
 *
 * Q4: a released pick that settles later must not end a NEWER pick's busy.
 * Each pick ends once — by its `finally` or by its release, whichever comes
 * first — so a late settle after the release changes nothing. No count is
 * needed: while a pick holds busy, Attach is disabled, so a second pick can
 * start only after the first was released (and so has already ended).
 */
export const ATTACH_STRANDED_MS = 3_000;

export const createAttachLatch = (setBusy: (busy: boolean) => void) => ({
	/** Marks a pick in flight; call the returned function in `finally`. */
	begin: (): (() => void) => {
		setBusy(true);
		let ended = false;
		const end = () => {
			if (ended) return;
			ended = true;
			if (watchdog !== undefined) clearTimeout(watchdog);
			setBusy(false);
		};
		const watchdog = launchingFromFallback()
			? setTimeout(end, ATTACH_STRANDED_MS)
			: undefined;
		return end;
	},
});

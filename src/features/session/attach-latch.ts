/**
 * Releases an owner's "attaching" latch when a picker launch never settles.
 *
 * WHY (#248, PR #328 QA round 1 Q2). Both composer owners set `attaching` when
 * a pick starts and clear it only in `finally`, once the native picker's
 * promise settles. On iOS a picker that UIKit refuses to present — the attach
 * handoff's fallback firing before the sheet's native dismissal began, or any
 * other refused presentation — never calls back, so that promise never
 * settles: Attach, Paste and Send then stayed disabled until the composer
 * remounted. A lost `onDismiss` alone strands nothing, because the latch is
 * set only BY the launch; an early launch is what strands it.
 *
 * WHY A TIMER IS SAFE HERE, and what its value does and does not bound. The
 * release changes nothing a reader can reach while a real picker is up: the
 * picker covers the composer (a UIKit modal presentation, an Android activity,
 * the browser's own file dialog) and takes every touch. The pick is still
 * awaited, so one that settles after the release still lands and clears the
 * latch again. So the value is not a cap on how long a reader may browse; it
 * bounds only how long a STRANDED paperclip stays disabled. NOT MEASURED: it
 * must outlast launch → the picker covering the screen, or a second tap could
 * start a second pick, which the native modules refuse (`expo-file-system`
 * keeps its picking context; that refusal shows the existing attach error
 * line, so it is visible, never silent). Three seconds is several times a
 * sheet-style presentation (~0.35 s) plus the picker module's first import.
 */
export const ATTACH_STRANDED_MS = 3_000;

/** Calls `release` after `ATTACH_STRANDED_MS` unless the returned stop runs
 *  first (the owner's `finally`). */
export const watchStrandedPick = (release: () => void): (() => void) => {
	const timer = setTimeout(release, ATTACH_STRANDED_MS);
	return () => clearTimeout(timer);
};

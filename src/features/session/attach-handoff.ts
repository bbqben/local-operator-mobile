/**
 * Close a sheet, THEN open a system picker — on iOS, only once the sheet's
 * native dismissal has finished.
 *
 * **Why ("Photo Library / Files doesn't open", TestFlight 1157 and the
 * 2026-11-15 report).** `expo-image-picker` and `expo-file-system` present their
 * pickers with `appContext.utilities.currentViewController().present(…)`.
 * That helper walks the presented chain but STOPS at a controller that
 * `isBeingDismissed` (expo-modules-core `Utilities.swift`), so a launch during a
 * sheet's dismissal presents either onto the dismissing sheet (and is taken
 * down with it) or onto a presenter that is still mid-transition (UIKit refuses
 * it). Either way no picker appears, no delegate callback fires, and the
 * JavaScript promise never settles — the reader sees nothing happen and the
 * owner's `attaching` latch keeps Attach disabled. A React Native `Modal` (every
 * `Sheet`) is exactly such a controller while it animates out, so the launch
 * waits for the Modal's own `onDismiss`, which React Native fires from the
 * native `dismissViewController` completion (`RCTModalHostViewComponentView.mm`)
 * — the first moment a presentation is safe.
 *
 * **No timer fallback on iOS.** This used to launch anyway after 500 ms if
 * `onDismiss` had not arrived. That number was never measured against the
 * dismissal it raced (the sheet's 120 ms exit animation, its JS-side finish
 * callback and re-render, then the native dismiss — all stretched by a busy JS
 * thread such as a streaming session), and whenever it won the race it produced
 * exactly the failure above. Without it, a lost `onDismiss` launches nothing —
 * and because the owner's busy state is only set BY the launch, nothing is
 * stranded: the reader presses Attach again, whose `cancel()` re-admits a fresh
 * choice.
 *
 * **A short settle after `onDismiss`, measured.** `onDismiss` is not late enough
 * on iOS 27.2: launching synchronously inside it presents the picker and UIKit
 * takes it down again 0.2–0.4 s later, so the promise never settles (simulator,
 * Debug build of main `ce2cacf0`, Photo Library, fresh launch each trial:
 * opened 0 of 8 and 1 of 8 times; deferring the launch by 0 ms opened 4 of 8,
 * 50 ms 8 of 8, 100 ms 8 of 8, 300 ms 7 of 8). The launch therefore runs
 * `LAUNCH_AFTER_DISMISS_MS` after `onDismiss`, not inside it. This is a settle
 * after the native event, not the old press-time guess it replaced above: it can
 * only start once the dismissal has finished, and a lost `onDismiss` still
 * launches nothing. Not verified on a physical device.
 *
 * **Android and web launch immediately.** Android's pickers are separate
 * activities started for a result, not controllers presented over the dialog,
 * and the web chooser is the browser's own; neither has the dismissal race, and
 * Android's `Modal` has no `onDismiss` to wait for.
 *
 * A plain module (no `react-native` import) so both sheets that launch pickers
 * — the composer's attach sheet and Team Bridge's — share one tested rule.
 * Split from local-operator-mobile PR #278 without its camera work.
 */
/** How long after the sheet's native dismissal an iOS picker may be presented.
 *  Measured on the iOS 27.2 simulator: 50 and 100 ms opened the picker 8 of 8
 *  times, 0 ms opened it 4 of 8. 100 ms is the value with margin on a busy
 *  thread. */
export const LAUNCH_AFTER_DISMISS_MS = 100;

export function createAttachmentSheetHandoff(
	/** Pickers keep the default. A caller whose action is not a system picker
	 *  (the message-actions sheet's reply/copy) passes 0 and runs inside
	 *  `onDismiss`, as before. */
	settleMs: number = LAUNCH_AFTER_DISMISS_MS,
) {
	let pending: (() => void) | undefined;
	let chosen = false;
	let settling: ReturnType<typeof setTimeout> | undefined;
	const cancel = () => {
		if (settling !== undefined) clearTimeout(settling);
		settling = undefined;
		pending = undefined;
		chosen = false;
	};
	const dismissed = () => {
		const launch = pending;
		// Consuming a selection is NOT reopening the sheet: queued row events
		// after onDismiss must not launch a second, different picker.
		pending = undefined;
		if (launch === undefined) return;
		if (settleMs <= 0) {
			launch();
			return;
		}
		if (settling !== undefined) clearTimeout(settling);
		settling = setTimeout(() => {
			settling = undefined;
			launch();
		}, settleMs);
	};
	return {
		choose: (launch: () => void, platform: string) => {
			// First iOS choice wins for this open, including the native dismissal
			// window. The opener's explicit cancel() is the only re-admission point.
			if (platform === "ios" && chosen) return;
			cancel();
			if (platform !== "ios") {
				launch();
				return;
			}
			chosen = true;
			pending = launch;
		},
		dismissed,
		cancel,
	};
}

export type AttachmentSheetHandoff = ReturnType<
	typeof createAttachmentSheetHandoff
>;

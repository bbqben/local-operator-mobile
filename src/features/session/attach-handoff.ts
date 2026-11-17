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
 * **Android and web launch immediately.** Android's pickers are separate
 * activities started for a result, not controllers presented over the dialog,
 * and the web chooser is the browser's own; neither has the dismissal race, and
 * Android's `Modal` has no `onDismiss` to wait for.
 *
 * A plain module (no `react-native` import) so both sheets that launch pickers
 * — the composer's attach sheet and Team Bridge's — share one tested rule.
 * Split from local-operator-mobile PR #278 without its camera work.
 */
export function createAttachmentSheetHandoff() {
	let pending: (() => void) | undefined;
	let chosen = false;
	const cancel = () => {
		pending = undefined;
		chosen = false;
	};
	const dismissed = () => {
		const launch = pending;
		// Consuming a selection is NOT reopening the sheet: queued row events
		// after onDismiss must not launch a second, different picker.
		pending = undefined;
		launch?.();
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

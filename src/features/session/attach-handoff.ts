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
 * **A fallback, started only once the Modal has been told to hide (#248).**
 * Native delivery of `onDismiss` was never proven on a device, and on iOS 26 a
 * reader saw the sheet close and no picker appear. So `hidden()` — the Sheet's
 * `onHidden`, called from the commit that stops holding the Modal shown, AFTER
 * its exit animation — arms `DISMISS_FALLBACK_MS`; whichever of the timer and
 * `onDismiss` runs first launches, and the other finds nothing pending. This is
 * not the old 500 ms timer: that one started at the row PRESS and raced the
 * exit animation, its JS finish callback and re-render, all stretched by a busy
 * JS thread (TestFlight 1157). This one cannot start before the JS side has
 * committed the hide, and it runs on that same JS thread, so a busy JS thread
 * only makes it later. What it still races is the UI thread mounting that
 * commit and running the dismissal, which is not animated (`animationType=
 * "none"`, so `dismissViewControllerAnimated:NO`) — see the constant.
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
/**
 * How long after the hide commit `onDismiss` may take before the picker
 * launches anyway.
 *
 * NOT MEASURED ON A DEVICE: no lane here can run iOS, and the dev-only trace
 * below (`afterHiddenMs`) is the instrument that measures it. What bounds it
 * instead: the dismissal it waits for is not animated (`animationType="none"`
 * on the Sheet's Modal maps to `dismissViewControllerAnimated:NO` in React
 * Native 0.86's `RCTModalHostViewComponentView.mm`), so the work is mounting
 * one prop change and one UIKit transaction — frames (8–17 ms each at
 * 120/60 Hz), not an animation. One second is about 60 frames at 60 Hz; it only
 * loses to a UI-thread stall longer than that. The cost of a larger value is
 * paid only when `onDismiss` is lost: the picker appears that much later.
 *
 * INVARIANT: the timer starts no earlier than the commit that hides the Modal
 * (`useModalExit`'s `onHidden`), so it never races the exit animation, and the
 * pending launch is consumed by whichever path runs first, so the picker opens
 * at most once per choice.
 */
export const DISMISS_FALLBACK_MS = 1_000;

type HandoffTrace = {
	via: "onDismiss" | "fallback";
	pending: boolean;
	afterHiddenMs: number | null;
};

/* Dev builds only: which path launched and how long after the hide commit,
 * so a device run can measure the distribution DISMISS_FALLBACK_MS bounds. */
const devTrace = (event: HandoffTrace) => {
	if (typeof __DEV__ !== "undefined" && __DEV__)
		console.info("[attach-handoff]", event);
};

export function createAttachmentSheetHandoff(trace = devTrace) {
	let pending: (() => void) | undefined;
	let chosen = false;
	let fallback: ReturnType<typeof setTimeout> | undefined;
	let hiddenAt: number | undefined;
	const disarm = () => {
		if (fallback !== undefined) clearTimeout(fallback);
		fallback = undefined;
	};
	const cancel = () => {
		disarm();
		pending = undefined;
		chosen = false;
		hiddenAt = undefined;
	};
	const launchPending = (via: HandoffTrace["via"]) => {
		disarm();
		const launch = pending;
		// Consuming a selection is NOT reopening the sheet: queued row events
		// after onDismiss must not launch a second, different picker.
		pending = undefined;
		trace({
			via,
			pending: launch !== undefined,
			afterHiddenMs: hiddenAt === undefined ? null : Date.now() - hiddenAt,
		});
		launch?.();
	};
	const dismissed = () => {
		launchPending("onDismiss");
		hiddenAt = undefined;
	};
	const hidden = () => {
		// Only an iOS choice waits; with nothing pending there is nothing to owe.
		if (pending === undefined || fallback !== undefined) return;
		hiddenAt = Date.now();
		fallback = setTimeout(() => launchPending("fallback"), DISMISS_FALLBACK_MS);
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
		hidden,
		cancel,
	};
}

export type AttachmentSheetHandoff = ReturnType<
	typeof createAttachmentSheetHandoff
>;

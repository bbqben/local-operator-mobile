/**
 * The REAL `Sheet` + the REAL attach hand-off against an emulation of iOS's
 * native modal host: when does a picker launch, relative to the sheet's
 * native presentation?
 *
 * WHY THIS EXISTS ("Photo Library / Files does nothing", TestFlight 1333). The
 * hand-off launches a picker from the Sheet's `onDismiss`, and its own tests
 * call `dismissed()` by hand, so they could not see WHEN iOS fires that
 * callback. `useModalExit` sets `exiting` in a passive effect, so a closing
 * Sheet hands its `Modal` `visible=false` for one commit and `visible=true`
 * again on the next (the same blip `sheet-dismiss-timing.test.tsx` pins on the
 * web). iOS's `RCTModalHostViewComponentView` (react-native 0.86,
 * `React/Fabric/Mounting/ComponentViews/Modal/RCTModalHostViewComponentView.mm`,
 * `updateProps` → `ensurePresentedOnlyIfNeeded`) acts on every `visible`
 * change: it dismisses the controller on the `false` commit, presents it again
 * on the `true` one, and fires `onDismiss` from the FIRST dismissal's
 * completion. The picker therefore launched while the sheet's controller was
 * presented again for the exit animation — expo-modules-core's
 * `currentViewController()` walks to it, the picker is presented ON the sheet,
 * and the exit's final dismissal takes it down with the sheet. No delegate
 * callback, no settled promise, no error line.
 *
 * WHAT IS EMULATED. The native host only: each committed `visible` is one
 * `updateProps`, and the dismiss completion is asynchronous (a macrotask), as
 * UIKit's is. React Native's `Modal.js` routes `onDismiss` to the LATEST props'
 * callback, which the emulation does too.
 */
import { act, createElement, type ReactNode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
	events: [] as string[],
	isPresented: false,
	dismissInFlight: 0,
	finishExit: null as null | (() => void),
	presses: new Map<string, { onPress?: () => void }>(),
}));

vi.mock("react-native", async (importOriginal) => {
	const rnw = (await importOriginal()) as Record<string, unknown>;
	const { useLayoutEffect, useRef: useMockRef } = await import("react");
	const Animated = rnw.Animated as Record<string, unknown>;
	/* One `updateProps` per commit, as Fabric's mounting layer applies it. */
	const Modal = (props: {
		visible: boolean;
		onDismiss?: () => void;
		children?: ReactNode;
	}) => {
		const latest = useMockRef(props);
		latest.current = props;
		useLayoutEffect(() => {
			const shouldPresent = props.visible;
			if (!native.isPresented && shouldPresent) {
				native.isPresented = true;
				native.events.push(
					native.dismissInFlight > 0
						? "native:present(during-dismiss)"
						: "native:present",
				);
			}
			if (native.isPresented && !shouldPresent) {
				native.isPresented = false;
				native.dismissInFlight += 1;
				native.events.push("native:dismiss");
				setTimeout(() => {
					native.dismissInFlight -= 1;
					native.events.push("native:dismissed");
					latest.current.onDismiss?.();
				}, 0);
			}
		}, [props.visible]);
		// Modal.js keeps rendering on iOS until the dismissal lands; the rows
		// must exist for the press.
		return props.children ?? null;
	};
	return {
		...rnw,
		Platform: { ...(rnw.Platform as object), OS: "ios" },
		Modal,
		Pressable: (props: { testID?: string; onPress?: () => void }) => {
			if (props.testID) native.presses.set(props.testID, props);
			return null;
		},
		Animated: {
			...Animated,
			parallel: () => ({
				start: (done?: (r: { finished: boolean }) => void) => {
					native.finishExit = () => done?.({ finished: true });
				},
				stop: () => {},
			}),
			timing: () => ({ start: () => {}, stop: () => {} }),
		},
	};
});
vi.mock("lucide-react-native", () => ({ X: () => null }));
vi.mock("@/lib/haptics", () => ({ haptic: () => {} }));
vi.mock("@/ui/appearance", async (importOriginal) => ({
	...((await importOriginal()) as object),
	useTheme: () => ({ theme: "light" }),
	useTokenColor: () => "#137742",
	useReducedMotion: () => false,
}));
vi.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("react-native-svg", () => {
	const none = () => null;
	return {
		__esModule: true,
		default: none,
		Defs: none,
		LinearGradient: none,
		Rect: none,
		Stop: none,
	};
});
vi.mock("uniwind", () => ({
	ScopedVariables: ({ children }: { children?: ReactNode }) => children ?? null,
	Uniwind: { setTheme: () => {}, updateCSSVariables: () => {} },
	useCSSVariable: () => undefined,
}));

const { installDomShim } = await import("@/testing/dom-shim");
const { Sheet } = await import("@/ui/components/sheet");
const { createAttachmentSheetHandoff } = await import(
	"@/features/session/attach-handoff"
);
const { Pressable } = await import("react-native");

/**
 * The composer's attach wiring (`composer.tsx`, `attachSheet`), reduced to the
 * parts the timing depends on: the row closes the sheet, marks the close as a
 * hand-off, and queues the launch on the hand-off; the Sheet's `onDismiss` is
 * the hand-off's. The composer itself needs the native renderer; its source is
 * pinned to this same wiring in `attachment-handoff.test.ts`.
 */
let openSheet: () => void = () => {};
const Owner = () => {
	const [open, setOpen] = useState(false);
	const [handingOff, setHandingOff] = useState(false);
	const handoff = useRef(createAttachmentSheetHandoff()).current;
	openSheet = () => {
		handoff.cancel();
		setHandingOff(false);
		setOpen(true);
	};
	const row = createElement(Pressable, {
		testID: "row-library",
		onPress: () => {
			setHandingOff(true);
			setOpen(false);
			handoff.choose(() => {
				native.events.push(
					native.isPresented || native.dismissInFlight > 0
						? "launch(onto-sheet)"
						: "launch",
				);
			}, "ios");
		},
	});
	const props = {
		visible: open,
		onClose: () => setOpen(false),
		onDismiss: handoff.dismissed,
		exitInstantly: handingOff,
		title: "attach",
		children: row,
	};
	return createElement(Sheet, props);
};

describe("iOS attach sheet → system picker, against the native modal host", () => {
	let dom: ReturnType<typeof installDomShim>;
	let root: ReturnType<typeof createRoot>;

	beforeEach(() => {
		vi.useFakeTimers();
		native.events = [];
		native.isPresented = false;
		native.dismissInFlight = 0;
		native.finishExit = null;
		native.presses.clear();
		dom = installDomShim();
		root = createRoot(dom.container as Element);
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		await act(async () => {
			vi.runOnlyPendingTimers();
		});
		dom.dispose();
		vi.useRealTimers();
	});

	const pressLibrary = async () => {
		await act(async () => root.render(createElement(Owner)));
		await act(async () => openSheet());
		expect(native.events).toEqual(["native:present"]);
		await act(async () => native.presses.get("row-library")?.onPress?.());
		// Every native completion and the exit's own end, in order.
		for (let i = 0; i < 4; i += 1) {
			await act(async () => {
				vi.runOnlyPendingTimers();
			});
			await act(async () => native.finishExit?.());
		}
	};

	it("launches the picker exactly once, after the sheet's ONLY native dismissal", async () => {
		await pressLibrary();
		expect(native.events).toEqual([
			"native:present",
			"native:dismiss",
			"native:dismissed",
			"launch",
		]);
	});

	it("is ready for a second attach: reopening presents the sheet again", async () => {
		await pressLibrary();
		native.events = [];
		await act(async () => openSheet());
		expect(native.events).toEqual(["native:present"]);
		expect(native.isPresented).toBe(true);
	});
});

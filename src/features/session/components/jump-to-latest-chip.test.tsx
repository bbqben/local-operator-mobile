import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type DomShim, installDomShim } from "@/testing/dom-shim";
import { CONTROL, ROLE } from "@/ui/a11y";
import { TOUCH_FLOOR } from "@/ui/layout";

/**
 * The chip's own contract (the list's decision is
 * `transcript-jump-to-latest.test.ts`'s): a real 44 pt target, the full
 * sentence as the accessible name at every width, the short VISIBLE label on a
 * 320 pt phone, the press wired, and the trailing-edge placement expressed
 * logically so an RTL layout puts it on the correct side.
 */
const rn = vi.hoisted(() => ({
	width: 390,
	pressable: null as null | {
		accessibilityLabel?: string;
		accessibilityRole?: string;
		testID?: string;
		onPress?: () => void;
		style?: Record<string, unknown>;
	},
	text: null as null | string,
}));
vi.mock("react-native", () => ({
	Platform: { OS: "web" },
	Pressable: (props: { children?: unknown; onPress?: () => void }) => {
		rn.pressable = props as never;
		return props.children ?? null;
	},
	Text: (props: { children?: unknown }) => {
		rn.text = props.children as string;
		return null;
	},
	useWindowDimensions: () => ({
		width: rn.width,
		height: 844,
		fontScale: 1,
		scale: 2,
	}),
}));
const { JumpToLatestChip } = await import(
	"@/features/session/components/jump-to-latest-chip"
);

let root: ReturnType<typeof createRoot> | null = null;
let dom: DomShim | null = null;
const render = (onPress: () => void) =>
	act(async () => root?.render(createElement(JumpToLatestChip, { onPress })));
beforeEach(() => {
	rn.width = 390;
	rn.pressable = null;
	rn.text = null;
	dom = installDomShim();
	root = createRoot(dom.container as Element);
});
afterEach(async () => {
	await act(async () => root?.unmount());
	root = null;
	dom?.dispose();
	dom = null;
});

describe("JumpToLatestChip", () => {
	it("is a real 44 pt button whose accessible name is the full sentence", async () => {
		const onPress = vi.fn();
		await render(onPress);
		expect(rn.pressable?.accessibilityRole).toBe(ROLE.button);
		expect(rn.pressable?.accessibilityLabel).toBe("↓ Jump to latest");
		expect(rn.pressable?.testID).toBe(CONTROL.transcriptJumpToLatest);
		expect(Number(rn.pressable?.style?.minHeight)).toBeGreaterThanOrEqual(
			TOUCH_FLOOR,
		);
		act(() => rn.pressable?.onPress?.());
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("shows the full label on a normal phone", async () => {
		await render(() => {});
		expect(rn.text).toBe("↓ Jump to latest");
	});

	it("shortens the visible label on the 320 pt phone, never the accessible name", async () => {
		rn.width = 320;
		await render(() => {});
		expect(rn.text).toBe("↓ Latest");
		expect(rn.pressable?.accessibilityLabel).toBe("↓ Jump to latest");
	});

	it("anchors to the trailing edge above the bottom fade, in logical terms", async () => {
		await render(() => {});
		const style = rn.pressable?.style ?? {};
		expect(style.end).toBeGreaterThan(0);
		expect(style.bottom).toBeGreaterThan(24);
		expect(style.left).toBeUndefined();
		expect(style.right).toBeUndefined();
	});
});

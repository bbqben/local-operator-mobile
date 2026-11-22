import { readFileSync } from "node:fs";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptEntry } from "@/contracts";
import { TAIL_CLAMP_OFFSET_PT } from "@/features/session/windowing";
import { type DomShim, installDomShim } from "@/testing/dom-shim";
import { TranscriptList } from "./transcript-list";

/**
 * The operator's rule (2026-11-21) at the LIST, not only in the pure decision:
 *
 *  - new output never yanks a reader who scrolled up;
 *  - that reader gets a "Jump to latest" chip exactly when new output arrived
 *    below them since they left;
 *  - pressing it — and SENDING a message — returns to the end and re-follows;
 *  - an older history page inserted above them is not new output, so no chip.
 *
 * The chip itself is mocked to a component that records its lifecycle: what
 * this file judges is the list's decision and the list's scroll calls, which is
 * where the defect would live. The chip's own visual contract (44 pt, its
 * accessible name, the narrow fallback) is `jump-to-latest-chip.test.tsx`'s.
 */
const host = vi.hoisted(() => ({
	props: null as unknown,
	scroll: vi.fn(),
}));
vi.mock("react-native", async () => {
	const React = await import("react");
	const passthrough = ({ children }: { children?: React.ReactNode }) =>
		children ?? null;
	return {
		Platform: { OS: "web" },
		View: passthrough,
		Text: passthrough,
		FlatList: React.forwardRef(
			(props: { ListFooterComponent?: React.ReactElement }, ref) => {
				React.useImperativeHandle(
					ref,
					() => ({ scrollToOffset: host.scroll }),
					[],
				);
				host.props = props;
				return props.ListFooterComponent ?? null;
			},
		),
	};
});
const chip = vi.hoisted(() => ({
	mounted: 0,
	press: null as null | (() => void),
}));
vi.mock("./jump-to-latest-chip", () => ({
	JumpToLatestChip: ({ onPress }: { onPress: () => void }) => {
		useEffect(() => {
			chip.mounted += 1;
			return () => {
				chip.mounted -= 1;
			};
		}, []);
		chip.press = onPress;
		return null;
	},
}));
vi.mock("@/features/session/components/transcript-edge-fades", () => ({
	TranscriptEdgeFades: () => null,
}));
vi.mock("@/features/session/components/transcript-row", () => ({
	TranscriptRow: () => null,
}));
vi.mock("@/features/session/components/turn-bar", () => ({
	TurnBar: () => null,
}));
vi.mock("@/features/session/components/quiet-group-bar", () => ({
	QuietGroupBar: () => null,
}));
vi.mock("@/features/session/components/fold-bar", () => ({
	FoldBar: () => null,
}));
vi.mock("@/features/session/components/supplement-block", () => ({
	SupplementBlock: () => null,
}));
vi.mock("@/ui/components/button", () => ({
	Button: () => null,
}));
vi.mock("@/features/session/components/older-history-edge", () => ({
	OlderHistoryEdge: () => null,
}));

interface ListProps {
	onContentSizeChange: (width: number, height: number) => void;
	onLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
	onScroll: (event: {
		nativeEvent: {
			contentOffset: { y: number };
			contentSize: { height: number };
			layoutMeasurement: { height: number };
		};
	}) => void;
}
const props = () => host.props as ListProps;
let root: ReturnType<typeof createRoot> | null = null;
let dom: DomShim | null = null;
let serial = 0;
let session = "";
const seed = JSON.parse(
	readFileSync(
		new URL("../../../../fixtures/relay/http/history-ok.json", import.meta.url),
		"utf8",
	),
).body.entries[0] as TranscriptEntry;
const rows = (count: number, prefix = "jump-row"): TranscriptEntry[] =>
	Array.from({ length: count }, (_, i) => ({
		...seed,
		id: `${prefix}-${i}`,
		kind: "user",
		text: `message ${i}`,
	}));
const VIEWPORT = 100;
const CONTENT = 1000;
async function render(entries: TranscriptEntry[], sending = false) {
	await act(async () =>
		root?.render(
			createElement(TranscriptList, {
				sessionId: session,
				entries,
				streamingRowId: null,
				sending,
				testID: "test-transcript",
			}),
		),
	);
}
const scrollTo = (offsetY: number, content = CONTENT) =>
	props().onScroll({
		nativeEvent: {
			contentOffset: { y: offsetY },
			contentSize: { height: content },
			layoutMeasurement: { height: VIEWPORT },
		},
	});
/** Mount the list settled at the tail, the state a fresh open lands in. */
async function openAtTail(entries: TranscriptEntry[]) {
	await render(entries);
	await act(async () => {
		props().onLayout({ nativeEvent: { layout: { height: VIEWPORT } } });
		props().onContentSizeChange(320, CONTENT);
		// The list's first frame is the tail; the reader has not moved yet.
		scrollTo(CONTENT - VIEWPORT);
	});
	host.scroll.mockClear();
}
/** The reader scrolls up, well outside the 48 pt follow band. */
const scrollAway = (content = CONTENT) => act(async () => scrollTo(0, content));
beforeEach(() => {
	session = `jump-test-${++serial}`;
	chip.mounted = 0;
	chip.press = null;
	host.scroll.mockClear();
	dom = installDomShim();
	root = createRoot(dom.container as Element);
});
afterEach(async () => {
	await act(async () => root?.unmount());
	root = null;
	dom?.dispose();
	dom = null;
});

describe("the jump-to-latest chip", () => {
	it("stays down until output arrives below a reader who left the end, and never pulls them", async () => {
		await openAtTail(rows(20));
		await scrollAway();
		expect(chip.mounted).toBe(0);

		/* A new message lands below the reader. The list must announce it and MUST
		 * NOT scroll: this is the "never yank" half of the rule. */
		await render(rows(21));
		await act(async () => props().onContentSizeChange(320, CONTENT + 44));
		expect(chip.mounted).toBe(1);
		expect(host.scroll).not.toHaveBeenCalled();
	});

	it("returns to the end when pressed, and retires itself", async () => {
		await openAtTail(rows(20));
		await scrollAway();
		await render(rows(21));
		await act(async () => props().onContentSizeChange(320, CONTENT + 44));
		expect(chip.mounted).toBe(1);

		await act(async () => chip.press?.());
		expect(host.scroll).toHaveBeenCalledWith({
			offset: TAIL_CLAMP_OFFSET_PT,
			animated: false,
		});
		expect(chip.mounted).toBe(0);
	});

	it("retires as soon as the reader is back at the end by their own scroll", async () => {
		await openAtTail(rows(20));
		await scrollAway();
		await render(rows(21));
		await act(async () => props().onContentSizeChange(320, CONTENT + 44));
		expect(chip.mounted).toBe(1);

		await act(async () => scrollTo(CONTENT + 44 - VIEWPORT, CONTENT + 44));
		expect(chip.mounted).toBe(0);
	});

	it("does not raise a chip for an older page inserted above the reader", async () => {
		await openAtTail(rows(20));
		await scrollAway();
		/* Ten OLDER messages land at the top: the last row is unchanged, which is
		 * the fact the decision reads (`jump-cue.ts`). */
		await render([...rows(10, "older"), ...rows(20)]);
		await act(async () => props().onContentSizeChange(320, CONTENT + 10 * 44));
		expect(chip.mounted).toBe(0);
		expect(host.scroll).not.toHaveBeenCalled();
	});

	it("snaps to the end when the reader sends, without waiting for the echo", async () => {
		await openAtTail(rows(20));
		await scrollAway();
		await render(rows(20), true);
		expect(host.scroll).toHaveBeenCalledWith({
			offset: TAIL_CLAMP_OFFSET_PT,
			animated: false,
		});
	});

	it("opens with the chip from the capture hook's `away` state", async () => {
		vi.stubGlobal("location", { search: "?lo-scroll=away" });
		await render(rows(20));
		expect(chip.mounted).toBe(1);
	});
});

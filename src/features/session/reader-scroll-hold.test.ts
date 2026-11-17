import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createReaderScrollHold, DRAG_RELEASE_MS } from "./reader-scroll-hold";

/*
 * TestFlight 1139 (operator): "when trying to scroll up it anchors me back to
 * the bottom on each frame in a jitter until I apply enough scroll up force to
 * break free". The agent transcript's tail pin ran whenever `atTail` held, and
 * `nextAtTail` keeps `atTail` true anywhere inside its 48 pt band, so a drag's
 * first points were clamped back to the end by every streamed row and layout
 * commit. The hold makes the reader's drag and its momentum off-limits to
 * every programmatic pin until the scroll comes to rest.
 */
const harness = () => {
	const timers: Array<{ run: () => void; ms: number }> = [];
	const onRest = vi.fn();
	const hold = createReaderScrollHold({
		onRest,
		schedule: (run, ms) => {
			const entry = { run, ms };
			timers.push(entry);
			return () => {
				const i = timers.indexOf(entry);
				if (i >= 0) timers.splice(i, 1);
			};
		},
	});
	return {
		hold,
		onRest,
		timers,
		runTimers() {
			for (const entry of timers.splice(0)) entry.run();
		},
	};
};

describe("reader scroll hold (TestFlight 1139)", () => {
	it("is active from the drag's first point until it rests", () => {
		const r = harness();
		expect(r.hold.active).toBe(false);
		r.hold.beginDrag();
		expect(r.hold.active).toBe(true);
		r.hold.endDrag();
		// The finger lifted, but a momentum glide may still begin.
		expect(r.hold.active).toBe(true);
		expect(r.timers[0]?.ms).toBe(DRAG_RELEASE_MS);
		r.runTimers();
		expect(r.hold.active).toBe(false);
		expect(r.onRest).toHaveBeenCalledOnce();
	});
	it("keeps holding through momentum, and rests when it ends", () => {
		const r = harness();
		r.hold.beginDrag();
		r.hold.endDrag();
		r.hold.beginMomentum();
		r.runTimers(); // the end-drag grace was cancelled
		expect(r.hold.active).toBe(true);
		expect(r.onRest).not.toHaveBeenCalled();
		r.hold.endMomentum();
		expect(r.hold.active).toBe(false);
		expect(r.onRest).toHaveBeenCalledOnce();
	});
	it("a new drag during the grace keeps holding", () => {
		const r = harness();
		r.hold.beginDrag();
		r.hold.endDrag();
		r.hold.beginDrag();
		expect(r.timers).toHaveLength(0);
		expect(r.hold.active).toBe(true);
	});
	it("dispose drops a pending release without resting", () => {
		const r = harness();
		r.hold.beginDrag();
		r.hold.endDrag();
		r.hold.dispose();
		expect(r.timers).toHaveLength(0);
		expect(r.onRest).not.toHaveBeenCalled();
	});
});

describe("transcript wiring", () => {
	const source = readFileSync(
		new URL("./components/transcript-list.tsx", import.meta.url),
		"utf8",
	);
	it("never pins the tail while the reader's scroll holds the list", () => {
		expect(source).toContain(
			"if (!atTail.current || scrollHold.current.active) return;",
		);
	});
	it("routes drag and momentum through the hold, and re-pins only at rest", () => {
		expect(source).toContain("scrollHold.current.beginDrag();");
		expect(source).toContain("scrollHold.current.endDrag();");
		expect(source).toContain("scrollHold.current.beginMomentum();");
		expect(source).toContain("scrollHold.current.endMomentum();");
		expect(source).toContain("scrollHold.current.dispose()");
	});
});

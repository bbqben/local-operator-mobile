import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ATTACH_STRANDED_MS, watchStrandedPick } from "./attach-latch";

/**
 * QA round 1, Q2 (#248): a picker launched too early by the attach handoff's
 * fallback can be refused by UIKit. Its promise then never settles, and the
 * owner's `finally { setAttaching(false) }` never runs: the paperclip, Paste
 * and Send stayed disabled until the composer remounted. The watchdog
 * releases that latch; a pick that does settle still lands and still clears it.
 */
const read = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");
const OWNER_WATCHDOG =
	/setAttaching\(true\);\s*const stopWatch = watchStrandedPick\(\(\) => setAttaching\(false\)\);[\s\S]*?finally \{\s*setAttaching\(false\);\s*stopWatch\(\);\s*\}/;

afterEach(() => vi.useRealTimers());

describe("stranded pick watchdog", () => {
	it("releases a latch whose pick never settles", () => {
		vi.useFakeTimers();
		const release = vi.fn();
		watchStrandedPick(release);
		vi.advanceTimersByTime(ATTACH_STRANDED_MS - 1);
		expect(release).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(release).toHaveBeenCalledOnce();
	});

	it("does nothing once the pick has settled", () => {
		vi.useFakeTimers();
		const release = vi.fn();
		const stop = watchStrandedPick(release);
		stop();
		vi.runAllTimers();
		expect(release).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it.each([
		["Session", "./use-composer.ts"],
		["Home", "../home/home.tsx"],
	])(
		"%s's picker attach is watched, and a settled pick still ends it",
		(_owner, path) => {
			expect(read(path)).toContain(
				'import { watchStrandedPick } from "@/features/session/attach-latch";',
			);
			expect(read(path)).toMatch(OWNER_WATCHDOG);
		},
	);
});

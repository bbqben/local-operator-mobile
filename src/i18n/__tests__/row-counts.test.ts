import { describe, expect, it } from "vitest";

import { renderFor } from "@/i18n";
import { countLabel } from "@/lib/format";

/**
 * The conversation row's count chips (O3-b) moved from `countLabel`'s
 * appended "s" to ICU plurals, because several shipped languages need more
 * than two noun forms. In English the keyed message must still say exactly
 * what `countLabel` said, at the 0 / 1 / 2 boundaries that pick the arm — a
 * row never paints a zero chip, but the `other` arm owning 0 is the CLDR rule
 * a translation is checked against, so it is pinned here too.
 */
const en = (key: Parameters<typeof renderFor>[0], params = {}) =>
	renderFor(key, params, "en");

const CHIPS = [
	["mobile.sidebar.row.asks", "ask"],
	["mobile.sidebar.row.agents", "agent"],
	["mobile.sidebar.row.todos", "todo"],
] as const;

describe("conversation-row counts are English plurals", () => {
	for (const [key, noun] of CHIPS) {
		it(`${key} at 0 / 1 / 2`, () => {
			expect(en(key, { count: 0 })).toBe(`0 ${noun}s`);
			expect(en(key, { count: 1 })).toBe(`1 ${noun}`);
			expect(en(key, { count: 2 })).toBe(`2 ${noun}s`);
			// Byte-identical to the helper it replaced, so shipped English is unchanged.
			for (const count of [0, 1, 2])
				expect(en(key, { count })).toBe(countLabel(count, noun));
		});
	}

	it("the asks chip's accessible name wraps the formatted count", () => {
		const asks = (count: number) =>
			en("mobile.sidebar.row.asks_not_blocker", {
				asks: en("mobile.sidebar.row.asks", { count }),
			});
		expect(asks(1)).toBe("1 ask, not a blocker");
		expect(asks(2)).toBe("2 asks, not a blocker");
	});
});

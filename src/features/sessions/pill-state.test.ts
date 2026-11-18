/**
 * The drawer pill's precedence (local-operator-mobile PR #301 design round 1).
 *
 * D1: a legacy `authorization_refused` is softened for two minutes, long enough
 * for the list's stale mark to rise; when the loop then stops on the refusal,
 * the pill must say Offline, not a calm "Last updated 3 min ago." beside the
 * conversation's red refusal. D2: the in-list stale line must not repeat the
 * sentence the pill already carries.
 */
import { describe, expect, it } from "vitest";

import {
	pillCarriesStaleNote,
	pillState,
	showInListStale,
} from "@/features/sessions/pill-state";

describe("pillState", () => {
	it("lets a STOPPED loop's offline outrank stale (D1)", () => {
		expect(pillState("offline", true, true)).toBe("offline");
	});

	it("keeps a retrying loop's transient offline behind stale (no red flash)", () => {
		expect(pillState("offline", true, false)).toBe("degraded");
		expect(pillState("offline", true)).toBe("degraded");
	});

	it("is unchanged where stale is not set", () => {
		expect(pillState("offline", false)).toBe("offline");
		expect(pillState("connecting", false)).toBe("reconnecting");
		expect(pillState("degraded", false)).toBe("degraded");
		expect(pillState("live", false, true)).toBe("connected");
		expect(pillState("connecting", true)).toBe("degraded");
	});
});

describe("the stale sentence has one home (D2)", () => {
	it("is carried by a stale degraded pill only", () => {
		expect(pillCarriesStaleNote("degraded", true)).toBe(true);
		expect(pillCarriesStaleNote("offline", true)).toBe(false);
		expect(pillCarriesStaleNote("degraded", false)).toBe(false);
	});

	it("drops the in-list line while the pill says it at normal text size", () => {
		expect(
			showInListStale({
				hasStaleMessage: true,
				pillCarriesStale: true,
				largeText: false,
			}),
		).toBe(false);
	});

	it("keeps the in-list line when the pill does not carry it", () => {
		// An Offline pill (D1), or no route and so no pill at all.
		expect(
			showInListStale({
				hasStaleMessage: true,
				pillCarriesStale: false,
				largeText: false,
			}),
		).toBe(true);
	});

	it("keeps the short age line at large text, where the pill truncates", () => {
		expect(
			showInListStale({
				hasStaleMessage: true,
				pillCarriesStale: true,
				largeText: true,
			}),
		).toBe(true);
		expect(
			showInListStale({
				hasStaleMessage: false,
				pillCarriesStale: false,
				largeText: true,
			}),
		).toBe(false);
	});
});

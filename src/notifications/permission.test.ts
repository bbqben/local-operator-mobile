import { describe, expect, it } from "vitest";

import {
	availabilityFromHook,
	availabilityFromStatus,
	canRequestPermission,
	pushCopy,
	pushEnableLabel,
} from "@/notifications/permission";

/**
 * The permission vocabulary's two rules, asserted:
 *
 *  1. an unreadable or unknown status must NEVER become `denied` (a refusal we
 *     did not receive must not be claimed as one), and
 *  2. only `undetermined` carries a control — the prompt is an act, not a
 *     mount effect.
 */

describe("availabilityFromStatus", () => {
	it("maps the two positive statuses", () => {
		expect(availabilityFromStatus("granted")).toBe("granted");
		expect(availabilityFromStatus("provisional")).toBe("granted");
	});

	it("maps the direct negatives and the untouched state", () => {
		expect(availabilityFromStatus("denied")).toBe("denied");
		expect(availabilityFromStatus("undetermined")).toBe("undetermined");
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["a number", 7],
		["a future status", "quietly-approved"],
	])("reads an unknown read (%s) as unknown, never denied", (_label, value) => {
		expect(availabilityFromStatus(value)).toBe("unknown");
	});
});

describe("the control's gate", () => {
	it("appears only while the OS has not been asked", () => {
		expect(canRequestPermission("undetermined")).toBe(true);
		expect(canRequestPermission("granted")).toBe(false);
		expect(canRequestPermission("denied")).toBe(false);
		expect(canRequestPermission("unsupported")).toBe(false);
		expect(canRequestPermission("unknown")).toBe(false);
	});

	it("U7: has one label, the same words as the primer and the nudge", () => {
		expect(pushEnableLabel()).toBe("Turn on notifications");
	});
});

describe("the copy table", () => {
	it("has a sentence for every state", () => {
		for (const state of [
			"unsupported",
			"granted",
			"denied",
			"undetermined",
			"unknown",
		] as const) {
			expect(pushCopy(state).length).toBeGreaterThan(0);
		}
	});

	it("D2/U3: never says computer alerts are off, under the switches that control them", () => {
		/* The computer's session pushes are registered now (this PR), so the
		 * old "not switched on yet … only while Local Operator is open" clause
		 * contradicted "Agent finished" right below it. */
		for (const state of ["granted", "denied", "undetermined"] as const) {
			const copy = pushCopy(state).toLowerCase();
			expect(copy).not.toContain("not switched on yet");
			expect(copy).not.toContain("only while local operator is open");
			expect(copy).not.toContain("you will be notified");
		}
	});

	it("D2: granted says notifications are on, and nothing more", () => {
		expect(pushCopy("granted")).toBe("Notifications are on for this phone.");
	});

	it("reads unknown as a failed check, not a refusal, and names the remedy", () => {
		expect(pushCopy("unknown")).toContain("not a refusal");
		expect(pushCopy("unknown")).toContain("reopen Settings");
	});
});

describe("availabilityFromHook", () => {
	it("accepts the five state names", () => {
		for (const state of [
			"granted",
			"denied",
			"undetermined",
			"unsupported",
			"unknown",
		] as const) {
			expect(availabilityFromHook(state)).toBe(state);
		}
	});

	it("refuses anything else — the hook cannot invent a sixth state", () => {
		expect(availabilityFromHook(null)).toBeNull();
		expect(availabilityFromHook("")).toBeNull();
		expect(availabilityFromHook("allowed")).toBeNull();
	});
});

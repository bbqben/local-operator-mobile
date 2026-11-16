import { describe, expect, it } from "vitest";

import type { PushDeviceRow } from "@/contracts";
import {
	deviceListEntries,
	deviceStateDescription,
	deviceTitle,
	PUSH_DEVICE_STATE_DESCRIPTIONS,
} from "@/notifications/devices";

/**
 * The mirror check: these strings are the CORE's words
 * (`push_devices.STATE_DESCRIPTIONS`), copied so two surfaces cannot spell one
 * state two ways. The assertions below are the copies written out again — that
 * is the point, not an accident: a reword here fails the test rather than
 * quietly drifting from the CLI legend the core renders.
 */

describe("the device state vocabulary", () => {
	it("carries the core's five descriptions verbatim", () => {
		expect(PUSH_DEVICE_STATE_DESCRIPTIONS).toEqual({
			live: "Registered. Notifications are delivered to this device.",
			expired:
				"Notifications are paused for this device until you sign in again.",
			unpaired: "This computer is no longer paired.",
			revoked: "This device was revoked on this computer.",
			absent: "Not in this computer's registry; it may register again.",
		});
	});

	it("reads every description as a sentence, not a fragment", () => {
		for (const description of Object.values(PUSH_DEVICE_STATE_DESCRIPTIONS)) {
			expect(description[0]).toBe(description[0]?.toUpperCase());
			expect(description.endsWith(".")).toBe(true);
		}
	});

	it("renders an unknown state as itself — never a guessed description", () => {
		expect(deviceStateDescription("live")).toBe(
			PUSH_DEVICE_STATE_DESCRIPTIONS.live,
		);
		expect(deviceStateDescription("a-future-state")).toBe("a-future-state");
	});
});

describe("device rows' titles", () => {
	it("prefers the machine's own name for the device", () => {
		expect(deviceTitle({ name: "Damian's iPhone", platform: "ios" })).toBe(
			"Damian's iPhone",
		);
	});

	it("falls back to the platform — never to the opaque device id", () => {
		expect(deviceTitle({ platform: "ios" })).toBe("iPhone");
		expect(deviceTitle({ name: "   ", platform: "android" })).toBe(
			"Android device",
		);
	});
});

describe("the Settings device list", () => {
	const row = (
		device_id: string,
		last_seen_at: number,
		extra: Partial<PushDeviceRow> = {},
	): PushDeviceRow => ({
		device_id,
		platform: "ios",
		app_version: "0.0.0 (1130)",
		registered_at: 1_794_000_000,
		last_seen_at,
		state: "live",
		...extra,
	});

	it("puts this phone first, titled as this phone", () => {
		const entries = deviceListEntries(
			[row("other-old", 100), row("mine", 50), row("other-new", 300)],
			"mine",
			"en-US",
		);
		expect(entries.map((entry) => entry.row.device_id)).toEqual([
			"mine",
			"other-new",
			"other-old",
		]);
		expect(entries[0]).toMatchObject({
			isThisDevice: true,
			title: "This iPhone",
			detail: null,
		});
		expect(
			deviceListEntries([row("a", 1, { platform: "android" })], "a")[0]?.title,
		).toBe("This Android device");
	});

	it("tells two other iPhones apart by when each was last active", () => {
		const [first, second] = deviceListEntries(
			[row("one", 1_794_778_637), row("two", 1_794_869_088)],
			null,
			"en-US",
		);
		expect(first?.title).toBe("iPhone");
		expect(second?.title).toBe("iPhone");
		expect(first?.detail?.startsWith("Last active ")).toBe(true);
		expect(first?.detail).not.toBe(second?.detail);
	});

	it("claims no row as this phone without an exact device id match", () => {
		const entries = deviceListEntries([row("x", 1), row("y", 2)], null);
		expect(entries.some((entry) => entry.isThisDevice)).toBe(false);
		expect(
			deviceListEntries([row("x", 1)], "not-registered-here").some(
				(entry) => entry.isThisDevice,
			),
		).toBe(false);
	});
});

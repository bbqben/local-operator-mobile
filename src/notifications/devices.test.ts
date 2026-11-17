import { afterEach, describe, expect, it } from "vitest";

import type { PushDeviceRow } from "@/contracts";
import { resetLocaleSource, SHIPPED_LOCALES, setLocaleSource } from "@/i18n";
import {
	deviceListEntries,
	deviceStateDescription,
	deviceTitle,
	PUSH_DEVICE_STATE_KEYS,
} from "@/notifications/devices";

/**
 * The core keeps its five state sentences in ENGLISH for its CLI legend
 * (`push_devices.STATE_DESCRIPTIONS`); this app renders them in the reader's
 * language from catalogue keys (design review D2), so it no longer mirrors the
 * core verbatim. What stays pinned: the ENGLISH catalogue says exactly what the
 * core's legend says today, so a reword on either side is a visible decision.
 */

afterEach(resetLocaleSource);

const CORE_ENGLISH = {
	live: "Registered with this computer.",
	expired: "Notifications are paused for this device until you sign in again.",
	unpaired: "This computer is no longer paired.",
	revoked: "This device was revoked on this computer.",
	absent: "Not in this computer's registry; it may register again.",
} as const;

describe("the device state vocabulary", () => {
	it("keys every state the core names", () => {
		expect(Object.keys(PUSH_DEVICE_STATE_KEYS).sort()).toEqual(
			Object.keys(CORE_ENGLISH).sort(),
		);
	});

	// D1: "live" claims only registration — neither the core nor the phone
	// observes delivery — and CORE_ENGLISH.live pins that wording.
	it("says in English what the core's CLI legend says", () => {
		for (const [state, sentence] of Object.entries(CORE_ENGLISH)) {
			expect(deviceStateDescription(state)).toBe(sentence);
		}
	});

	it.each(SHIPPED_LOCALES.filter((locale) => locale !== "en"))(
		"renders every state in %s, not English (D2)",
		(locale) => {
			setLocaleSource(() => locale);
			for (const [state, english] of Object.entries(CORE_ENGLISH)) {
				const rendered = deviceStateDescription(state);
				expect(rendered.length).toBeGreaterThan(0);
				expect(rendered).not.toBe(english);
				expect(rendered).not.toBe(state);
			}
		},
	);

	it("renders an unknown state as itself — never a guessed description", () => {
		expect(deviceStateDescription("a-future-state")).toBe("a-future-state");
		// An inherited Object key is not a state either.
		expect(deviceStateDescription("toString")).toBe("toString");
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

	it("formats Last active in the app's language, not the device's (D3)", () => {
		const seen = [row("other", 1_794_778_637)];
		setLocaleSource(() => "fr");
		const [entry] = deviceListEntries(seen, null);
		const french = new Date(1_794_778_637 * 1000).toLocaleString("fr", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
		expect(entry?.detail).toBe(`Dernière activité : ${french}`);
	});
});

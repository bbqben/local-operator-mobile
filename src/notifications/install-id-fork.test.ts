import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One installation, one identity — through the REAL registration path.
 *
 * The operator's computer listed 33 "iPhone" rows for one phone (2026-11-16):
 * 33 distinct install ids, 32 registered once and never again, in bursts of up
 * to six a second, while the original row kept re-registering in between. That
 * is what `ensureInstallRecord` did when the keystore failed to answer: it read
 * "could not read" as "never minted", minted, failed to save the mint for the
 * same reason, and minted again on the next attempt.
 *
 * Unlike `use-session-push-registration.test.ts` (which mocks `install-id`
 * away), these cells run `registerSessionPushDevice` over the real
 * `install-id` module, with only the keystore, the OS and the transport
 * replaced. The keystore seam models iOS's locked keychain: every read and
 * write throws `errSecInteractionNotAllowed` while `locked` is set.
 */

const seam = vi.hoisted(() => ({
	os: "ios",
	locked: false,
	item: null as string | null,
	mints: 0,
	reads: 0,
}));
vi.mock("react-native", () => ({
	Platform: {
		get OS() {
			return seam.os;
		},
	},
}));
vi.mock("expo-crypto", () => ({
	randomUUID: () => {
		seam.mints += 1;
		return `00000000-0000-4000-8000-${String(seam.mints).padStart(12, "0")}`;
	},
}));
vi.mock("expo-constants", () => ({
	default: { expoConfig: { version: "0.0.0", ios: { buildNumber: "1130" } } },
}));
vi.mock("@/connection", () => {
	const adapter = {
		getItemAsync: async () => {
			seam.reads += 1;
			// The answer is taken when the read STARTS and delivered later, the
			// way keychain I/O overlaps: concurrent first-launch callers all see
			// "absent" before any of them has written.
			const locked = seam.locked;
			const value = seam.item;
			await new Promise((resolve) => setTimeout(resolve, 0));
			if (locked) throw new Error("errSecInteractionNotAllowed");
			return value;
		},
		setItemAsync: async (_key: string, value: string) => {
			if (seam.locked) throw new Error("errSecInteractionNotAllowed");
			seam.item = value;
		},
		deleteItemAsync: async () => {
			seam.item = null;
		},
	};
	return {
		expoSecureStore: async () => adapter,
		memorySecureStore: () => adapter,
	};
});
vi.mock("@/notifications/native", () => ({
	notificationsSupported: () => true,
	loadNotifications: async () => ({
		getPermissionsAsync: async () => ({ status: "granted" }),
	}),
	devicePushToken: async () => ({
		token: "synthetic-apns-token",
		platform: "ios",
	}),
}));

import {
	ensureInstallRecord,
	InstallRecordUnavailable,
	resetInstallRecordForTests,
} from "@/notifications/install-id";
import {
	registerSessionPushDevice,
	resetSessionPushRegistrationMemory,
} from "@/notifications/session-push-registration";

const posted: string[] = [];
const client = {
	registerDevice: async (request: { install_id: string }) => {
		posted.push(request.install_id);
		return {
			device_id: `device-${posted.length}`,
			device_key: "synthetic-key",
		};
	},
};
const ORIGINAL = "5a1b2c3d-4e5f-4061-8273-8495a6b7c8d9";

beforeEach(() => {
	seam.os = "ios";
	seam.locked = false;
	seam.item = JSON.stringify({ v: 1, install_id: ORIGINAL });
	seam.mints = 0;
	seam.reads = 0;
	posted.length = 0;
	resetInstallRecordForTests();
	resetSessionPushRegistrationMemory();
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("a keystore that cannot answer", () => {
	it("never registers a second identity — the 33-row reproduction", async () => {
		// The measured shape: forced attempts while locked, then one unlocked.
		seam.locked = true;
		const locked = [];
		for (let attempt = 0; attempt < 6; attempt += 1) {
			locked.push(
				await registerSessionPushDevice(client, {
					routeKey: "computer-a",
					force: true,
				}),
			);
		}
		seam.locked = false;
		const unlocked = await registerSessionPushDevice(client, {
			routeKey: "computer-a",
			force: true,
		});

		// Every POST carried the stored identity: the daemon saw one device.
		expect(new Set(posted)).toEqual(new Set([ORIGINAL]));
		expect(locked.every((result) => result.outcome === "failed")).toBe(true);
		expect(unlocked.outcome).toBe("registered");
		expect(seam.mints).toBe(0);
		// The stored identity is untouched by the locked attempts.
		expect(JSON.parse(seam.item ?? "{}").install_id).toBe(ORIGINAL);
	});

	it("refuses to hand out an identity it read nothing for", async () => {
		seam.locked = true;
		await expect(ensureInstallRecord()).rejects.toBeInstanceOf(
			InstallRecordUnavailable,
		);
		expect(seam.mints).toBe(0);
	});

	it("refuses an unsaved first mint on a native keystore, then mints once", async () => {
		seam.item = null;
		// Reads answer "absent" but the write fails: an unsaved id would be
		// re-minted by the next call, so it is never returned.
		const store = await import("@/connection");
		const adapter = await store.expoSecureStore();
		const failingWrite = {
			...adapter,
			setItemAsync: async () => {
				throw new Error("errSecInteractionNotAllowed");
			},
		};
		resetInstallRecordForTests(failingWrite);
		await expect(ensureInstallRecord()).rejects.toBeInstanceOf(
			InstallRecordUnavailable,
		);
		resetInstallRecordForTests();
		const first = await ensureInstallRecord();
		const again = await ensureInstallRecord();
		expect(again.install_id).toBe(first.install_id);
		expect(JSON.parse(seam.item ?? "{}").install_id).toBe(first.install_id);
	});
});

describe("a first launch with concurrent callers", () => {
	it("mints exactly one id however many surfaces ask at once", async () => {
		seam.item = null;
		const records = await Promise.all(
			Array.from({ length: 5 }, () => ensureInstallRecord()),
		);
		expect(new Set(records.map((record) => record.install_id)).size).toBe(1);
		expect(seam.mints).toBe(1);
	});
});

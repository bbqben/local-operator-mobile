import { describe, expect, it } from "vitest";

import {
	SECURE_KEYS,
	SecureStorage,
	type SecureStoreAdapter,
	type SecureStoreOptions,
	SecureStoreUnavailableError,
} from "./storage";

/**
 * Sign-in survives a locked phone and an app update (operator report,
 * 2026-11-16: "on each update in testflight it's asking me to sign into radient
 * again").
 *
 * The fake below models expo-secure-store 57's iOS module as read from
 * `node_modules/expo-secure-store/ios/SecureStoreModule.swift`, because the
 * migration's safety depends on three of its exact behaviours:
 *
 *  - the read query is `(service, key)` only, WITHOUT `kSecAttrAccessible`, so a
 *    read finds an item whatever its class;
 *  - `set` is `SecItemAdd`, and on `errSecDuplicateItem` a `SecItemUpdate` of the
 *    DATA ONLY — the accessibility class of an existing item never changes, so
 *    passing a new `keychainAccessible` on write migrates nothing;
 *  - a `WHEN_UNLOCKED*` item cannot be read while the device is locked
 *    (`errSecInteractionNotAllowed`, -25308), while `AFTER_FIRST_UNLOCK*` can.
 */
const WHEN_UNLOCKED = "WHEN_UNLOCKED_THIS_DEVICE_ONLY";
const AFTER_FIRST_UNLOCK = "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY";
const SERVICE = "lop.mobile.background";

function fakeKeychain() {
	const items = new Map<string, { value: string; accessible: string }>();
	const state = { locked: false };
	const slot = (key: string, options?: SecureStoreOptions) =>
		`${options?.keychainService ?? "app"}|${key}`;
	const adapter: SecureStoreAdapter = {
		async getItemAsync(key, options) {
			const item = items.get(slot(key, options));
			if (!item) return null;
			if (state.locked && item.accessible.startsWith("WHEN_UNLOCKED"))
				throw new Error(
					"User interaction is not allowed. (errSecInteractionNotAllowed -25308)",
				);
			return item.value;
		},
		async setItemAsync(key, value, options) {
			const existing = items.get(slot(key, options));
			if (existing) {
				if (state.locked && existing.accessible.startsWith("WHEN_UNLOCKED"))
					throw new Error("errSecInteractionNotAllowed");
				existing.value = value; // SecItemUpdate: data only, class kept
				return;
			}
			items.set(slot(key, options), {
				value,
				accessible: options?.keychainAccessible ?? "WHEN_UNLOCKED",
			});
		},
		async deleteItemAsync(key, options) {
			items.delete(slot(key, options));
		},
	};
	return { adapter, items, state };
}

const grant = {
	access: "access-token",
	refresh: "refresh-token",
	expires_at: 4_000_000_000_000,
	account_label: "reader",
	scope: "openid",
	token_type: "Bearer",
};

/** A keychain as a build before this change left it: the grant written with the
 *  old class, under expo's default service. */
function upgradedPhone() {
	const keychain = fakeKeychain();
	keychain.items.set(`app|${SECURE_KEYS.oauth}`, {
		value: JSON.stringify(grant),
		accessible: WHEN_UNLOCKED,
	});
	return keychain;
}

const storageFor = (adapter: SecureStoreAdapter) =>
	new SecureStorage(adapter, {
		keychainAccessible: AFTER_FIRST_UNLOCK,
		keychainService: SERVICE,
		legacy: { keychainAccessible: WHEN_UNLOCKED },
	});

describe("a keychain that cannot answer is not an empty keychain", () => {
	it("throws SecureStoreUnavailableError on a locked read instead of reporting no grant", async () => {
		const keychain = upgradedPhone();
		keychain.state.locked = true;
		const storage = new SecureStorage(keychain.adapter, {
			keychainAccessible: WHEN_UNLOCKED,
		});

		await expect(storage.readOauth()).rejects.toBeInstanceOf(
			SecureStoreUnavailableError,
		);
		// And nothing was deleted on the way.
		expect(keychain.items.has(`app|${SECURE_KEYS.oauth}`)).toBe(true);
	});
});

describe("moving credentials to a class readable after first unlock", () => {
	it("reads the old item, then keeps answering once the phone locks", async () => {
		const keychain = upgradedPhone();
		const storage = storageFor(keychain.adapter);

		expect((await storage.readOauth())?.access).toBe("access-token");
		expect(keychain.items.get(`${SERVICE}|${SECURE_KEYS.oauth}`)).toEqual({
			value: JSON.stringify(grant),
			accessible: AFTER_FIRST_UNLOCK,
		});
		// The old item goes only after the new one was read back.
		expect(keychain.items.has(`app|${SECURE_KEYS.oauth}`)).toBe(false);

		// The background relaunch iOS does after a TestFlight update, phone locked.
		keychain.state.locked = true;
		expect((await storage.readOauth())?.access).toBe("access-token");
	});

	it("never loses the item when the copy cannot be written", async () => {
		const keychain = upgradedPhone();
		const failing: SecureStoreAdapter = {
			...keychain.adapter,
			async setItemAsync() {
				throw new Error("errSecInteractionNotAllowed");
			},
		};

		expect((await storageFor(failing).readOauth())?.access).toBe(
			"access-token",
		);
		expect(keychain.items.has(`app|${SECURE_KEYS.oauth}`)).toBe(true);
	});

	it("is unavailable, not signed out, when the old item is locked", async () => {
		const keychain = upgradedPhone();
		keychain.state.locked = true;

		await expect(
			storageFor(keychain.adapter).readOauth(),
		).rejects.toBeInstanceOf(SecureStoreUnavailableError);
		expect(keychain.items.has(`app|${SECURE_KEYS.oauth}`)).toBe(true);
	});

	it("writes new items in the background-readable class", async () => {
		const keychain = fakeKeychain();
		await storageFor(keychain.adapter).writeOauth(grant);

		expect(
			keychain.items.get(`${SERVICE}|${SECURE_KEYS.oauth}`)?.accessible,
		).toBe(AFTER_FIRST_UNLOCK);
	});

	it("sign-out clears the old copy too, so it cannot resurrect a grant", async () => {
		const keychain = upgradedPhone();
		const storage = storageFor(keychain.adapter);
		await storage.writeTunnelSession({
			grant: "g",
			grant_expires_at: 1,
			refresh_handle: "h",
			refresh_expires_at: 2,
			hostname: "h.example.invalid",
			tunnel_id: "t",
			minted_at: 0,
		});

		await storage.clearAll();

		expect(keychain.items.size).toBe(0);
		expect(await storage.readOauth()).toBeNull();
	});
});

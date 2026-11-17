import { describe, expect, it, vi } from "vitest";

/**
 * Proof of the lost-theme chain on the NATIVE path (operator report,
 * 2026-11-16). Every interactive Radient sign-in runs the auth purge
 * (`signInWithRadient` → `retireAuthorization(…, "reauthenticate")` →
 * `clearAuthorizationData`), and on native that purge deletes the sealed
 * `device` family WHOLE — the family the theme and sidebar view were stored in.
 * The web branch keeps non-private keys (`authorization-cleanup.test.ts`); native
 * did not. The preferences now live in `state/preference-store.ts`, outside it.
 *
 * The sealed store is replaced by a map per family whose `clear()` deletes the
 * family, as `native-private-store.ts` does (`new Directory(root, family).delete()`).
 */
const families = vi.hoisted(() => new Map<string, Map<string, string>>());

vi.mock("react-native", () => ({
	Platform: { OS: "ios" },
	AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));
vi.mock("expo-file-system", () => {
	class Directory {
		exists = false;
		info() {
			return { exists: false };
		}
		list() {
			return [];
		}
	}
	return { Directory, File: class {}, Paths: { document: {}, cache: {} } };
});
vi.mock("./native-private-store", () => {
	const nativePrivateStore = (family: string) => {
		if (!families.has(family)) families.set(family, new Map());
		const data = () => families.get(family) as Map<string, string>;
		return {
			get: async (key: string) => data().get(key) ?? null,
			set: async (key: string, value: string) => {
				data().set(key, value);
			},
			remove: async (key: string) => {
				data().delete(key);
			},
			keys: async () => [...data().keys()],
			clear: async () => {
				data().clear();
			},
		};
	};
	return {
		nativePrivateStore,
		eraseNativePrivateInstallation: async () => undefined,
	};
});

import { createPreferenceStore } from "@/state/preference-store";
import { THEME_SELECTION_KEY } from "@/state/theme-preference";
import { clearAuthorizationData, deviceStore } from "./device-storage";
import { reopenPrivateWrites } from "./scoped-storage";

const CHOSEN = JSON.stringify({ v: 1, mode: "dark", darkTheme: "dracula" });

describe("a sign-in's privacy purge and the reader's theme (native)", () => {
	it("the sealed device family loses the theme on every sign-in purge", async () => {
		reopenPrivateWrites();
		await deviceStore.set(THEME_SELECTION_KEY, CHOSEN);
		expect(await deviceStore.get(THEME_SELECTION_KEY)).toBe(CHOSEN);

		await clearAuthorizationData();

		// The cause: this is where the theme USED to live.
		expect(await deviceStore.get(THEME_SELECTION_KEY)).toBeNull();
	});

	it("the preference store keeps it through the same purge", async () => {
		reopenPrivateWrites();
		const file = new Map<string, string>();
		const store = createPreferenceStore({
			primary: {
				get: async (key) => file.get(key) ?? null,
				set: async (key, value) => {
					file.set(key, value);
				},
			},
			legacy: deviceStore,
		});
		// An earlier build's value, adopted on first read.
		await deviceStore.set(THEME_SELECTION_KEY, CHOSEN);
		expect(await store.get(THEME_SELECTION_KEY)).toBe(CHOSEN);

		await clearAuthorizationData();

		expect(await store.get(THEME_SELECTION_KEY)).toBe(CHOSEN);
	});
});

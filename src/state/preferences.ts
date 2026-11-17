import { AppState, Platform } from "react-native";

import { deviceStore } from "@/features/session/device-storage";
import {
	createPreferenceStore,
	filePreferenceBackend,
	type PreferenceBackend,
	type PreferenceFileSystem,
} from "./preference-store";

/**
 * The app's preference store (`preference-store.ts` explains why preferences no
 * longer live in the sealed device family).
 *
 * Native: one file per key under Documents, adopting a value an earlier build
 * left in the sealed `device` family. Web: `localStorage` directly — the web
 * purge already keeps non-private keys, and the earlier build wrote the same
 * key there, so no migration is needed.
 */
const webBackend: PreferenceBackend = {
	async get(key) {
		return globalThis.localStorage?.getItem(key) ?? null;
	},
	async set(key, value) {
		globalThis.localStorage?.setItem(key, value);
	},
};

export const preferenceStore: PreferenceBackend =
	Platform.OS === "web"
		? webBackend
		: createPreferenceStore({
				primary: filePreferenceBackend(
					async () =>
						(await import(
							"expo-file-system"
						)) as unknown as PreferenceFileSystem,
				),
				legacy: deviceStore,
			});

/** Every transition to `active` — the moment protected data is readable again
 *  after a locked background launch. */
export function subscribeAppActive(listener: () => void): () => void {
	const subscription = AppState.addEventListener("change", (state) => {
		if (state === "active") listener();
	});
	return () => subscription.remove();
}

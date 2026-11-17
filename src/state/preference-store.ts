/**
 * Where the reader's DEVICE PREFERENCES live: the theme and the sidebar view.
 *
 * WHY NOT `deviceStore`. Until 2026-11-16 both were written to the sealed
 * native `device` family (`features/session/device-storage.ts`), the family
 * that holds drafts and command envelopes. Every auth boundary purges that
 * family WHOLE (`clearAuthorizationData` → `sealedDeviceStore.clear()`), and
 * every interactive Radient sign-in runs one (`signInWithRadient` →
 * `retireAuthorization(…, "reauthenticate")`). So a reader sent to sign in
 * again after a TestFlight update lost their theme as well — the operator's two
 * symptoms were one chain. The web branch of the same purge already keeps
 * non-private keys (`authorization-cleanup.test.ts` asserts "appearance"
 * survives); native did not. The family is also cryptographically erased when
 * its install marker in `Paths.cache` is missing, which iOS may purge.
 *
 * A preference is not account data: it describes the phone, carries nothing
 * the reader typed, and must survive sign-out, a re-sign-in and an update. So it
 * gets its own small store, outside every privacy purge.
 *
 * MIGRATION. A build that predates this store left the value in the sealed
 * family. `get` falls back to that `legacy` reader when the new store has
 * nothing, copies what it finds forward, and never deletes the old copy (the
 * next privacy purge does that). A legacy read that FAILS propagates: "could not
 * read" must never be mistaken for "nothing stored" (see `hydrateWhenAvailable`).
 *
 * Pure and port-injected so it runs in Node; `preferences.ts` binds it to the
 * platform.
 */
export interface PreferenceBackend {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
}

export function createPreferenceStore(deps: {
	primary: PreferenceBackend;
	legacy?: Pick<PreferenceBackend, "get">;
}): PreferenceBackend {
	return {
		async get(key) {
			const value = await deps.primary.get(key);
			if (value !== null || !deps.legacy) return value;
			const legacy = await deps.legacy.get(key);
			if (legacy === null) return null;
			/* Best-effort: a failed copy leaves the legacy value as the source,
			 * and the next read tries again. */
			await deps.primary.set(key, legacy).catch(() => undefined);
			return legacy;
		},
		set: (key, value) => deps.primary.set(key, value),
	};
}

/** The subset of `expo-file-system` (SDK 57) the file backend uses. */
export interface PreferenceFileSystem {
	Paths: { document: unknown };
	Directory: new (
		...parts: unknown[]
	) => {
		info(): { exists?: boolean };
		create(options?: { intermediates?: boolean }): void;
	};
	File: new (
		...parts: unknown[]
	) => {
		info(): { exists?: boolean };
		text(): string | Promise<string>;
		create(options?: { overwrite?: boolean; intermediates?: boolean }): void;
		write(value: string): void;
		delete(): void;
		move(destination: unknown): void | Promise<void>;
	};
}

/** The directory under the app's Documents. Documents survives app updates (it
 *  is the container iOS carries across an update), and files in it default to
 *  `NSFileProtectionCompleteUntilFirstUserAuthentication`, so a background
 *  relaunch on a locked phone can still read the theme after the first unlock. */
export const PREFERENCES_DIRECTORY = "lo-mobile-preferences";

/**
 * One plain JSON-ish file per key. Plaintext on purpose: a theme id is not a
 * secret, and an encryption key would bring back exactly the keychain and
 * install-marker dependencies this store exists to escape.
 *
 * Writes go to `<name>.next`, then replace the file by move, so a process killed
 * mid-write leaves either the old value or the new one — never a torn file that
 * would parse as "no preference" and reset the reader's choice. A read falls
 * back to `.next` for the one window where the old file is gone and the move has
 * not landed.
 */
export function filePreferenceBackend(
	load: () => Promise<PreferenceFileSystem>,
): PreferenceBackend {
	const files = async (key: string) => {
		const fs = await load();
		const directory = new fs.Directory(
			fs.Paths.document,
			PREFERENCES_DIRECTORY,
		);
		const name = `${encodeURIComponent(key)}.json`;
		return {
			fs,
			directory,
			target: new fs.File(directory, name),
			next: new fs.File(directory, `${name}.next`),
		};
	};
	return {
		async get(key) {
			const { target, next } = await files(key);
			if (target.info().exists) return await target.text();
			if (next.info().exists) return await next.text();
			return null;
		},
		async set(key, value) {
			const { directory, target, next } = await files(key);
			if (!directory.info().exists) directory.create({ intermediates: true });
			next.create({ overwrite: true });
			next.write(value);
			if (target.info().exists) target.delete();
			await next.move(target);
		},
	};
}

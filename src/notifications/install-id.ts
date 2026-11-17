import { createPushGeneration } from "@/notifications/push-generation";
/**
 * The device's install identity: one UUID, minted once, kept where a reinstall
 * cannot silently duplicate it.
 *
 * ADR 0006 §3.1 makes `install_id` the device's identity on the register
 * contract — "idempotent on (install_id, platform): re-registering with a
 * rotated token REPLACES the row" — and puts its custody in the keystore
 * ("minted once and kept in the keystore", §3.1). The same item holds this
 * device's `device_id` and `device_key` once a registration has happened,
 * because that is exactly how the ADR scopes them: "held by the phone in the
 * keystore keyed by its `install_id`" (§4's credential row). One item, keyed
 * by the id that survives every re-registration — two items could disagree
 * about which device they describe.
 *
 * **Why this does NOT join `SecureStorage.clearAll()`.** A revoke must STICK
 * for the same device. The computer's operator can revoke this phone
 * (`DELETE /api/push/devices/{id}`, `lop mobile devices revoke`), and if
 * signing out destroyed the install id, the next launch would mint a fresh
 * one, register a fresh row and quietly undo the revoke — the exact bypass the
 * tombstone exists to prevent (`push_devices.revoke`'s docstring: "the row
 * stays, which is what makes the revoke stick for the same install_id instead
 * of being undone by the app's next launch"). A stable id is also what keeps
 * one phone to one daemon row across sign-ins: registration upserts on
 * `(install_id, platform)`. The device identity therefore outlives the
 * credentials stored beside it, and this module owns its key rather than
 * reusing `SECURE_KEYS` — a name in that table is a name `clearAll` promises
 * to clear.
 *
 * **Sign-out does NOT revoke on the computer** (an earlier version of this
 * comment said it did; no build ever sent that DELETE). The daemon's only
 * removal verb is that sticky tombstone, so calling it on sign-out would make
 * this install's next sign-in answer `403 device_revoked` forever — and the
 * phone could not undo it. Sign-out therefore leaves the computer's row live
 * until its credential lapses (`credential_expires_at`), so a signed-out phone
 * may still get that computer's content-free session pushes meanwhile. The
 * remedy is a non-tombstone daemon unregister verb; it is deferred (PR #259
 * review round 1, R1-3). Sign-out does retire this phone from Team Bridge's
 * hub (`team-bridge/retirement.ts`), whose DELETE is not a tombstone.
 *
 * **The web fallback is stated, not hidden** (the pattern
 * `features/auth/tunnel-storage.ts` sets): a browser runtime has no keystore,
 * so the record lives for the session only — and the Settings surface that
 * reads it says "this device" only when the record is actually persistent.
 */

import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import {
	expoSecureStore,
	memorySecureStore,
	type SecureStoreAdapter,
} from "@/connection";

/** The keystore item. Deliberately not in `SECURE_KEYS`: that table is the set
 *  `SecureStorage.clearAll()` clears on sign-out, and this item must survive it
 *  (see the module note). Prefixed like the others so a dump is legible. */
export const INSTALL_RECORD_KEY = "lop.mobile.install";

/** The record's shape. `v` exists so a future field can migrate the item rather
 *  than guess at a partial one. */
export interface InstallRecord {
	v: 1;
	install_id: string;
	/** Present only after a successful registration. */
	device_id?: string;
	/** Present only after a successful registration; the response that minted it
	 *  is the only place it is ever sent, so this item is its one home. */
	device_key?: string;
	/** Highest durable Team Bridge device incarnation. Outlives sign-out so a
	 * delayed authenticated registration cannot outrun its later removal. */
	bridge_generation?: number;
}

const isRecord = (value: unknown): value is InstallRecord => {
	if (value === null || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	if (record.v !== 1) return false;
	if (typeof record.install_id !== "string" || record.install_id.length === 0) {
		return false;
	}
	if (record.device_id !== undefined && typeof record.device_id !== "string") {
		return false;
	}
	if (
		record.device_key !== undefined &&
		typeof record.device_key !== "string"
	) {
		return false;
	}
	return true;
};

let adapter: SecureStoreAdapter | null = null;

/** One adapter per app run — the singleton rule `tunnel-storage.ts` states, for
 *  the same reason (building one per screen opens a second keystore handle for
 *  nothing). */
async function open(): Promise<SecureStoreAdapter> {
	if (adapter !== null) return adapter;
	adapter =
		Platform.OS === "web" ? memorySecureStore() : await expoSecureStore();
	return adapter;
}

/**
 * The keystore could not ANSWER — distinct from "there is no record".
 *
 * WHY THIS IS ITS OWN ERROR, AND WHY IT MUST NOT MINT. The install id is this
 * phone's identity on every computer it registers with: the daemon upserts on
 * `(install_id, platform)`, so a new id is a new device row, a new push target
 * in the cloud, and a way around a revoke. Before this error existed a failed
 * keystore read was treated as "never minted", so any keystore error minted a
 * fresh id — and when the write failed too (the same unavailable keystore), the
 * NEXT attempt minted again. iOS, for one, refuses keychain reads and writes
 * with `errSecInteractionNotAllowed` while the device is locked, and this item
 * uses expo-secure-store's default `WHEN_UNLOCKED` accessibility. One iPhone
 * left 33 rows on one computer, 32 of them registered once and never seen
 * again, in bursts of up to six a second, while its original row kept
 * re-registering in between (2026-11-15) — the signature of reads that failed
 * intermittently while the stored record stayed intact. A registration that
 * cannot read its identity now fails and is retried on the next attempt, when
 * the keystore answers again.
 */
export class InstallRecordUnavailable extends Error {
	constructor(cause?: unknown) {
		super("The device's install record could not be read or saved");
		this.name = "InstallRecordUnavailable";
		if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
	}
}

/** Read the item, telling "absent" (null) apart from "could not read" (throws
 *  `InstallRecordUnavailable`). A present-but-unparseable item reads as absent:
 *  that is a deterministic fact about the stored bytes, not a transient
 *  failure, so re-minting over it converges on one new id rather than forking. */
async function readInstallRecordStrict(): Promise<InstallRecord | null> {
	let raw: string | null;
	try {
		const store = await open();
		raw = await store.getItemAsync(INSTALL_RECORD_KEY);
	} catch (error) {
		throw new InstallRecordUnavailable(error);
	}
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/** The stored record, or null — for readers that only want to know what is
 *  there (the sound prefetch). It never mints, so mapping "could not read" to
 *  null is safe HERE; identity-bearing callers use `ensureInstallRecord`, which
 *  refuses to guess. */
export async function readInstallRecord(): Promise<InstallRecord | null> {
	try {
		return await readInstallRecordStrict();
	} catch {
		return null;
	}
}

/** Writes the record. Returns whether it can survive a restart, so a caller can
 *  say which of the two it is rather than implying persistence everywhere. */
export async function writeInstallRecord(
	record: InstallRecord,
): Promise<{ persistent: boolean }> {
	try {
		const store = await open();
		await store.setItemAsync(INSTALL_RECORD_KEY, JSON.stringify(record));
		return { persistent: Platform.OS !== "web" };
	} catch {
		return { persistent: false };
	}
}

/** The mint in flight, shared by concurrent callers. The registration effect,
 *  Team Bridge and the generation counter can all ask for the identity in the
 *  same tick on a first launch; without this each would read "absent" and mint
 *  its own id. */
let minting: Promise<InstallRecord> | null = null;

/**
 * The record, minting the install id on first need — and ONLY on a keystore
 * that answered "no record".
 *
 * The mint is `Crypto.randomUUID()` — the platform CSPRNG, no network, no
 * platform identifier (a device serial is exactly what the ADR does not want
 * here). It is idempotent: an existing record is returned untouched, and
 * concurrent callers share one mint (`minting`).
 *
 * It THROWS `InstallRecordUnavailable` rather than hand out an identity it
 * cannot stand behind: when the keystore cannot be read (the device is locked),
 * and when a freshly minted record could not be saved on a platform that has a
 * keystore — an unsaved id would be re-minted by the very next call, which is
 * the fork this module exists to prevent (`InstallRecordUnavailable`'s note).
 * The web runtime has no keystore and is session-scoped by design (module
 * note), so its in-memory record is accepted as it always was.
 */
export async function ensureInstallRecord(): Promise<InstallRecord> {
	if (minting !== null) return minting;
	const run = (async () => {
		const existing = await readInstallRecordStrict();
		if (existing !== null) return existing;
		const minted: InstallRecord = { v: 1, install_id: Crypto.randomUUID() };
		const saved = await writeInstallRecord(minted);
		if (!saved.persistent && Platform.OS !== "web")
			throw new InstallRecordUnavailable();
		return minted;
	})();
	minting = run;
	try {
		return await run;
	} finally {
		if (minting === run) minting = null;
	}
}

/** Drop the adapter and any mint in flight; tests swap the keystore under the
 *  module with `adapterForTests`. */
export function resetInstallRecordForTests(
	adapterForTests: SecureStoreAdapter | null = null,
): void {
	adapter = adapterForTests;
	minting = null;
}

/**
 * Records the outcome of a registration: the device id the machine minted and
 * the per-device key it returned (ADR §3.1: the response that mints the key is
 * the only place it is ever sent).
 */
/** Reserve an incarnation only after durable keystore persistence succeeds. */
export const nextBridgePushGeneration = createPushGeneration({
	read: async () => (await ensureInstallRecord()).bridge_generation,
	write: async (generation) => {
		const record = await ensureInstallRecord();
		const saved = await writeInstallRecord({
			...record,
			bridge_generation: generation,
		});
		if (!saved.persistent)
			throw new Error("Device incarnation could not be persisted");
	},
});

export async function recordRegistration(
	deviceId: string,
	deviceKey: string,
): Promise<void> {
	const record = await ensureInstallRecord();
	const result = await writeInstallRecord({
		...record,
		device_id: deviceId,
		device_key: deviceKey,
	});
	if (result.persistent)
		for (const listener of registrationListeners) listener();
}

/** Registration is `session-push-registration.ts`'s. Observers prefetch only
 * AFTER its keystore write succeeds, never from a token/registration request in
 * flight. */
const registrationListeners = new Set<() => void>();
export function onPushRegistration(listener: () => void): () => void {
	registrationListeners.add(listener);
	return () => {
		registrationListeners.delete(listener);
	};
}

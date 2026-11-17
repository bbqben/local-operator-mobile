/**
 * The ONLY module that touches `expo-secure-store` (or the Keychain / Android
 * Keystore behind it).
 *
 * The rule this file enforces is `docs/architecture.md` principle 4: *secrets
 * live in the platform keystore, in one module; no screen reads a token.* Above
 * this file, credentials are a plain object that is passed into exactly the two
 * callers that need them — the HTTP layer (for the `Cookie` header) and the
 * refresh scheduler — and never into a store or a component.
 *
 * Storage decisions, all from `ADR 0002` §3 "Storage":
 *
 * - **One small JSON item per concern**, not one blob: a corrupt item must cost
 *   one credential, not the sign-in state.
 * - **Bounded size.** iOS has historically refused SecureStore values over ~2 KB,
 *   so a value that large is refused here with a named error rather than failing
 *   in the platform layer at the worst moment. The retry envelope, which can
 *   legitimately be megabytes, therefore belongs in DEVICE storage and is not
 *   stored here (see `relay/retry-envelope.ts`).
 * - **`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, no `requireAuthentication`.** The
 *   app owner passes the class (`backgroundReadableAccessibility`) so iOS can
 *   relaunch the app on a locked phone — after a TestFlight update, for a silent
 *   push — and still read the sign-in. Items an earlier build wrote as
 *   `WHEN_UNLOCKED_THIS_DEVICE_ONLY` are moved over on first read (`getRaw`).
 *   `requireAuthentication` is deliberately off because it would block a
 *   background refresh and force a sign-in the user would read as a bug.
 * - **Never logged.** `describe()` exists so a diagnostic screen can say what is
 *   present without any value crossing the boundary.
 */

/* Type-only, and deliberately so: the two shapes are read for their fields and nothing
 * else, so this module still loads with no React Native, no bundler and no cycle. */
import type { RadientTokens } from "./radient-oauth";
import type { TunnelSession } from "./tunnel-session";

/** The subset of `expo-secure-store` this module uses. Narrow on purpose: the
 *  adapter is injected, so the module is testable in Node and the dependency is
 *  visible in one place. */
export interface SecureStoreAdapter {
	getItemAsync(
		key: string,
		options?: SecureStoreOptions,
	): Promise<string | null>;
	setItemAsync(
		key: string,
		value: string,
		options?: SecureStoreOptions,
	): Promise<void>;
	deleteItemAsync(key: string, options?: SecureStoreOptions): Promise<void>;
}

export interface SecureStoreOptions {
	keychainAccessible?: string;
	/** Deliberately never set at v1 (`ADR 0002` §3). */
	requireAuthentication?: boolean;
	keychainService?: string;
}

/** Storage keys. Prefixed so a future migration can find its own items, and so a
 *  dump of the keystore (which nobody should take) is at least legible. */
export const SECURE_KEYS = {
	oauth: "lop.mobile.oauth",
	tunnel: "lop.mobile.tunnel",
	custom: "lop.mobile.custom",
	startupAuthorization: "lop.mobile.startup-authorization",
	privateDataKey: "lop.mobile.private-data-key",
} as const;

/** The value iOS has historically refused. Anything larger is refused here. */
export const MAX_SECURE_VALUE_CHARS = 2_048;
const INSTALL_ID =
	/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PRIVATE_KEY_HEX = /^[a-f0-9]{64}$/i;

/** The Radient OAuth set. `expires_at` is epoch ms (the desktop client's unit and
 *  the one `Date.now()` compares against). */
export interface RadientOAuthSet {
	access: string;
	refresh: string | null;
	expires_at: number;
	/** The account label only — never an email address in a log line. */
	account_label: string | null;
	/** The opaque Radient account id (`RadientTokens.account_id`). Optional so a
	 *  set stored before it existed still parses. */
	account_id?: string | null;
	scope: string;
	token_type: string;
}

/** The tunnel session set. The grant is short-lived and kept here anyway,
 *  because losing it across a restart would cost a mint round trip on every cold
 *  start. */
export interface TunnelSessionSet {
	grant: string;
	grant_expires_at: number;
	/** The absolute 30-day refresh handle; it never rotates server-side. */
	refresh_handle: string;
	refresh_expires_at: number;
	hostname: string;
	tunnel_id: string;
	/** When the handle was minted, so the day-25 re-mint can be scheduled without
	 *  trusting `refresh_expires_at` alone. */
	minted_at: number;
}

/** The custom route's set. The password is present only when the user opted to
 *  remember it. */
export interface CustomRouteSet {
	base_url: string;
	password: string | null;
	allow_insecure: boolean;
}

/** A random admission generation, NOT an account identifier or credential digest.
 *
 * The three states are three different boundaries; collapsing them would either
 * lose a reader's drafts on a token blip or expose them to the next sign-in:
 *
 * - `active` — the generation the current drafts belong to, bound to the exact
 *   route it was proven against.
 * - `revoked` — the session ended without proof (`401`, lapsed grant, cancelled
 *   login). No draft is deleted; the next login mints a different generation, so
 *   the old drafts are unreachable from it rather than destroyed.
 * - `tombstone` — a sign-out or identity change erased the private data. The
 *   marker survives a crash mid-deletion, and the next admission finishes that
 *   cleanup before it may hand out a new generation. */
export type StartupAuthorizationRecord =
	| {
			version: 1;
			state: "active";
			generation: string;
			route: string;
			recoveryAuthority?: string;
	  }
	| { version: 1; state: "revoked" | "tombstone" | "reauthenticate" };

/** The install marker lives in the app sandbox; the key lives only in the
 * platform keystore. Matching both prevents iOS Keychain survival after an
 * uninstall from silently granting a new installation access to old ciphertext. */
export type PrivateDataKey = Readonly<{ installId: string; keyHex: string }>;

/** A value that cannot be stored safely, with the reason named. */
export class SecureStorageError extends Error {
	override readonly name = "SecureStorageError";
	readonly key: string;
	constructor(message: string, key: string) {
		super(message);
		this.key = key;
	}
}

/**
 * The keystore could not ANSWER — distinct from "there is no item".
 *
 * WHY THIS IS ITS OWN ERROR. iOS refuses keychain reads with
 * `errSecInteractionNotAllowed` while an item's protection class is not
 * available (a `WHEN_UNLOCKED*` item on a locked phone), and TestFlight installs
 * updates — and iOS relaunches apps for a silent push or background fetch —
 * while the phone is locked. `read` used to map that to `null`, so the cold
 * start concluded "never signed in" and the reader was sent to sign in again
 * with a perfectly good grant still in the keychain (operator report,
 * 2026-11-16; the install id had the same defect, fixed in mobile #287).
 *
 * Deliberately NOT a `SecureStorageError`: `openPrivateInstallation` treats that
 * class as "positively malformed, reset it", and a locked keychain must never
 * be reset. Callers that may defer (the Radient restore) catch this by class;
 * everything else lets it propagate like any other I/O failure.
 */
export class SecureStoreUnavailableError extends Error {
	override readonly name = "SecureStoreUnavailableError";
	readonly key: string;
	constructor(key: string, cause: unknown) {
		super("The device keystore could not be read right now", { cause });
		this.key = key;
	}
}

/** Whether a credential set is present. Never carries the value. */
export interface StoragePresence {
	oauth: boolean;
	oauthExpiresInMs: number | null;
	tunnel: boolean;
	tunnelExpiresInMs: number | null;
	customRoute: boolean;
	remembersPassword: boolean;
}

/**
 * The secure store, by concern.
 *
 * Every read tolerates a corrupt item by returning `null` and deleting it: a
 * half-written value must degrade to "sign in again", never to a request signed
 * with a truncated token or a crash on a cold start. A keystore that cannot
 * ANSWER is different: that throws `SecureStoreUnavailableError` and deletes
 * nothing, because a locked phone is not a signed-out reader.
 */
export class SecureStorage {
	private readonly adapter: SecureStoreAdapter;
	private readonly options: SecureStorageOptions;

	constructor(adapter: SecureStoreAdapter, options: SecureStorageOptions = {}) {
		this.adapter = adapter;
		this.options = options;
	}

	/** What is stored, in a form safe to render. */
	async presence(): Promise<StoragePresence> {
		const now = this.options.now?.() ?? Date.now();
		const [oauth, tunnel, custom] = await Promise.all([
			this.readOauth(),
			this.readTunnelSession(),
			this.readCustomRoute(),
		]);
		return {
			oauth: oauth !== null,
			oauthExpiresInMs: oauth ? oauth.expires_at - now : null,
			tunnel: tunnel !== null,
			tunnelExpiresInMs: tunnel ? tunnel.refresh_expires_at - now : null,
			customRoute: custom !== null,
			remembersPassword: custom?.password != null,
		};
	}

	async readOauth(): Promise<RadientOAuthSet | null> {
		return this.read(SECURE_KEYS.oauth, parseOauth);
	}

	async writeOauth(value: RadientOAuthSet): Promise<void> {
		await this.write(SECURE_KEYS.oauth, value);
	}

	async readTunnelSession(): Promise<TunnelSessionSet | null> {
		return this.read(SECURE_KEYS.tunnel, parseTunnel);
	}

	async writeTunnelSession(value: TunnelSessionSet): Promise<void> {
		await this.write(SECURE_KEYS.tunnel, value);
	}

	async readCustomRoute(): Promise<CustomRouteSet | null> {
		return this.read(SECURE_KEYS.custom, parseCustom);
	}

	async writeCustomRoute(value: CustomRouteSet): Promise<void> {
		await this.write(SECURE_KEYS.custom, value);
	}

	/** Unlike credential discovery, this read cannot interpret a locked keystore
	 * as absence: that would admit a replacement scope over unfinished cleanup. */
	async readStartupAuthorization(): Promise<StartupAuthorizationRecord | null> {
		const raw = await this.getRaw(SECURE_KEYS.startupAuthorization);
		if (raw === null) return null;
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			value = null;
		}
		if (typeof value === "object" && value !== null) {
			const record = value as {
				version?: unknown;
				state?: unknown;
				generation?: unknown;
				route?: unknown;
				recoveryAuthority?: unknown;
			};
			if (record.version === 1 && record.state === "tombstone")
				return { version: 1, state: "tombstone" };
			if (record.version === 1 && record.state === "reauthenticate")
				return { version: 1, state: "reauthenticate" };
			if (record.version === 1 && record.state === "revoked")
				return { version: 1, state: "revoked" };
			if (
				record.version === 1 &&
				record.state === "active" &&
				typeof record.generation === "string" &&
				record.generation.length > 0 &&
				typeof record.route === "string" &&
				record.route.length > 0 &&
				(record.recoveryAuthority === undefined ||
					(typeof record.recoveryAuthority === "string" &&
						record.recoveryAuthority.length > 0))
			)
				return {
					version: 1,
					state: "active",
					generation: record.generation,
					route: record.route,
					...(typeof record.recoveryAuthority === "string"
						? { recoveryAuthority: record.recoveryAuthority }
						: {}),
				};
		}
		throw new SecureStorageError(
			"The startup authorization record is unreadable",
			SECURE_KEYS.startupAuthorization,
		);
	}

	async writeStartupAuthorization(
		value: StartupAuthorizationRecord,
	): Promise<void> {
		await this.write(SECURE_KEYS.startupAuthorization, value);
	}

	/** Do not use credential discovery's corrupt-item fallback here. A lost or
	 * malformed key must refuse decryption, never overwrite recoverable bytes. */
	async readPrivateDataKey(): Promise<PrivateDataKey | null> {
		const raw = await this.getRaw(SECURE_KEYS.privateDataKey);
		if (raw === null) return null;
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			value = null;
		}
		if (
			typeof value === "object" &&
			value !== null &&
			"installId" in value &&
			typeof value.installId === "string" &&
			INSTALL_ID.test(value.installId) &&
			"keyHex" in value &&
			typeof value.keyHex === "string" &&
			PRIVATE_KEY_HEX.test(value.keyHex)
		) {
			return { installId: value.installId, keyHex: value.keyHex };
		}
		throw new SecureStorageError(
			"The private storage key is unreadable",
			SECURE_KEYS.privateDataKey,
		);
	}

	async clearPrivateDataKey(): Promise<void> {
		if (!(await this.deleteEverywhere(SECURE_KEYS.privateDataKey)))
			throw new SecureStorageError(
				"Private key removal could not be confirmed",
				SECURE_KEYS.privateDataKey,
			);
	}

	async writePrivateDataKey(value: PrivateDataKey): Promise<void> {
		if (
			!INSTALL_ID.test(value.installId) ||
			!PRIVATE_KEY_HEX.test(value.keyHex)
		)
			throw new SecureStorageError(
				"The private storage key is invalid",
				SECURE_KEYS.privateDataKey,
			);
		await this.write(SECURE_KEYS.privateDataKey, value);
	}

	/** Sign-out. Clears every item this app owns; unrelated keystore items are
	 *  another app's business. Privacy deletion must fail visibly rather than
	 *  reuse credential discovery's best-effort corrupt-item removal. */
	async clearAll(): Promise<void> {
		await Promise.all(
			Object.values(SECURE_KEYS).map(async (key) => {
				if (!(await this.deleteEverywhere(key)))
					throw new SecureStorageError(
						"Credential removal could not be confirmed",
						key,
					);
			}),
		);
	}

	/** The Radient grant is gone but the tunnel session is kept: the ADR keeps the
	 *  tunnel session until the user acts, so a lapsed OAuth token does not throw
	 *  away a still-valid 30-day handle. */
	async clearOauthOnly(): Promise<void> {
		await this.remove(SECURE_KEYS.oauth);
	}

	private async read<T>(
		key: string,
		parse: (value: unknown) => T | null,
	): Promise<T | null> {
		/* A keystore that cannot answer THROWS (`SecureStoreUnavailableError`); it
		 * used to read as absent, which signed a reader out of a phone that was
		 * merely locked. Only a positively corrupt item is removed below. */
		const raw = await this.getRaw(key);
		if (raw === null) return null;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			await this.remove(key);
			return null;
		}
		const value = parse(parsed);
		if (value === null) await this.remove(key);
		return value;
	}

	private async write(key: string, value: unknown): Promise<void> {
		const raw = JSON.stringify(value);
		if (raw.length > MAX_SECURE_VALUE_CHARS) {
			throw new SecureStorageError(
				`this value is too large for the platform keystore (${raw.length} > ${MAX_SECURE_VALUE_CHARS} characters)`,
				key,
			);
		}
		/* No legacy delete here: reads prefer the current slot, removals clear
		 * both (`deleteEverywhere`), and an adapter that ignores
		 * `keychainService` (memory, web) would delete the value just written. */
		await this.adapter.setItemAsync(key, raw, this.writeOptions());
	}

	/**
	 * Reads `key`, adopting a copy an earlier build wrote under the legacy
	 * service/class.
	 *
	 * WHY A SECOND SERVICE RATHER THAN RE-WRITING IN PLACE. expo-secure-store's
	 * iOS `set` is `SecItemAdd`, falling back on `errSecDuplicateItem` to a
	 * `SecItemUpdate` of the DATA ONLY (`SecureStoreModule.swift`, 57.0.4): an
	 * existing item keeps its accessibility class forever, whatever
	 * `keychainAccessible` a later write passes. The only way to change the class
	 * is a new item, and delete-then-add would leave a window where a kill loses
	 * the credential. So the new item lives under its own `keychainService`, is
	 * written and READ BACK before the old one is deleted, and the old one stays
	 * readable as a fallback until then — no step of the migration can lose it.
	 * Reads do not filter on class (the query is service + account only), so the
	 * fallback finds old items whatever class they were written with.
	 */
	private async getRaw(key: string): Promise<string | null> {
		let raw: string | null;
		try {
			raw = await this.adapter.getItemAsync(key, this.writeOptions());
		} catch (error) {
			throw new SecureStoreUnavailableError(key, error);
		}
		if (raw !== null || !this.options.legacy) return raw;
		let legacy: string | null;
		try {
			legacy = await this.adapter.getItemAsync(key, this.legacyOptions());
		} catch (error) {
			throw new SecureStoreUnavailableError(key, error);
		}
		if (legacy === null) return null;
		try {
			/* Re-check: a write that landed since the first read is newer than the
			 * legacy copy and must not be overwritten by it. */
			if (
				(await this.adapter.getItemAsync(key, this.writeOptions())) === null
			) {
				await this.adapter.setItemAsync(key, legacy, this.writeOptions());
				if (
					(await this.adapter.getItemAsync(key, this.writeOptions())) === legacy
				) {
					await this.adapter.deleteItemAsync(key, this.legacyOptions());
					/* An adapter that ignores `keychainService` (the memory and web
					 * stores) has ONE slot, so that delete took the copy too. */
					if (
						(await this.adapter.getItemAsync(key, this.writeOptions())) === null
					)
						await this.adapter.setItemAsync(key, legacy, this.writeOptions());
				}
			}
		} catch {
			/* The old item is untouched; the next read tries again. */
		}
		return legacy;
	}

	/** Deletes `key` from the current and the legacy slot and reports whether both
	 *  now read as absent. Sign-out must clear both, or a stale legacy copy would
	 *  be adopted on the next read and resurrect a grant the reader removed. */
	private async deleteEverywhere(key: string): Promise<boolean> {
		await this.adapter.deleteItemAsync(key, this.writeOptions());
		if ((await this.adapter.getItemAsync(key, this.writeOptions())) !== null)
			return false;
		if (!this.options.legacy) return true;
		await this.adapter.deleteItemAsync(key, this.legacyOptions());
		return (
			(await this.adapter.getItemAsync(key, this.legacyOptions())) === null
		);
	}

	private async remove(key: string): Promise<void> {
		try {
			await this.adapter.deleteItemAsync(key, this.writeOptions());
			if (this.options.legacy)
				await this.adapter.deleteItemAsync(key, this.legacyOptions());
		} catch {
			/* Best-effort: every caller of `remove` re-reads afterwards, and a failed
			 * delete leaves a value that is still parseable or still ignored. */
		}
	}

	/** Accessibility is set on every call, not only on the first write: it is a
	 *  per-item attribute on iOS, and a value written once without it would keep
	 *  the wrong level for the life of the install. */
	private writeOptions(): SecureStoreOptions {
		const options: SecureStoreOptions = {};
		if (this.options.keychainAccessible)
			options.keychainAccessible = this.options.keychainAccessible;
		if (this.options.keychainService)
			options.keychainService = this.options.keychainService;
		return options;
	}

	private legacyOptions(): SecureStoreOptions {
		const options: SecureStoreOptions = {};
		const legacy = this.options.legacy;
		if (legacy?.keychainAccessible)
			options.keychainAccessible = legacy.keychainAccessible;
		if (legacy?.keychainService)
			options.keychainService = legacy.keychainService;
		return options;
	}
}

export interface SecureStorageOptions {
	/** The class every write uses (and the slot reads look in first). */
	keychainAccessible?: string;
	/** The keychain service of the current slot; `undefined` is expo's default. */
	keychainService?: string;
	/** Where an earlier build wrote the same keys. When set, a read that finds
	 *  nothing in the current slot falls back to it and moves the item over
	 *  without ever deleting it first (see `getRaw`). */
	legacy?: { keychainAccessible?: string; keychainService?: string };
	now?: () => number;
}

function parseOauth(value: unknown): RadientOAuthSet | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Partial<RadientOAuthSet>;
	if (typeof candidate.access !== "string" || candidate.access.length === 0)
		return null;
	if (
		typeof candidate.expires_at !== "number" ||
		!Number.isFinite(candidate.expires_at)
	)
		return null;
	return {
		access: candidate.access,
		refresh:
			typeof candidate.refresh === "string" && candidate.refresh.length > 0
				? candidate.refresh
				: null,
		expires_at: candidate.expires_at,
		account_label:
			typeof candidate.account_label === "string"
				? candidate.account_label
				: null,
		account_id:
			typeof candidate.account_id === "string" &&
			candidate.account_id.length > 0
				? candidate.account_id
				: null,
		scope: typeof candidate.scope === "string" ? candidate.scope : "",
		token_type:
			typeof candidate.token_type === "string"
				? candidate.token_type
				: "Bearer",
	};
}

function parseTunnel(value: unknown): TunnelSessionSet | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Partial<TunnelSessionSet>;
	if (typeof candidate.grant !== "string" || candidate.grant.length === 0)
		return null;
	if (
		typeof candidate.refresh_handle !== "string" ||
		candidate.refresh_handle.length === 0
	)
		return null;
	if (typeof candidate.hostname !== "string" || candidate.hostname.length === 0)
		return null;
	if (
		typeof candidate.grant_expires_at !== "number" ||
		typeof candidate.refresh_expires_at !== "number"
	)
		return null;
	return {
		grant: candidate.grant,
		grant_expires_at: candidate.grant_expires_at,
		refresh_handle: candidate.refresh_handle,
		refresh_expires_at: candidate.refresh_expires_at,
		hostname: candidate.hostname,
		tunnel_id:
			typeof candidate.tunnel_id === "string" ? candidate.tunnel_id : "",
		minted_at:
			typeof candidate.minted_at === "number" ? candidate.minted_at : 0,
	};
}

function parseCustom(value: unknown): CustomRouteSet | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Partial<CustomRouteSet>;
	if (typeof candidate.base_url !== "string" || candidate.base_url.length === 0)
		return null;
	return {
		base_url: candidate.base_url,
		password:
			typeof candidate.password === "string" && candidate.password.length > 0
				? candidate.password
				: null,
		allow_insecure: candidate.allow_insecure === true,
	};
}

/**
 * An in-memory adapter: the tests' store, and the honest fallback for a runtime
 * with no keystore (the web target of `expo export`).
 *
 * It is deliberately NOT a silent production fallback: a caller that reaches for
 * this outside a test must say so, because "the credential leaks on restart" is
 * a security decision rather than a convenience.
 */
export function memorySecureStore(
	seed: Record<string, string> = {},
): SecureStoreAdapter & { readonly items: Map<string, string> } {
	const items = new Map<string, string>(Object.entries(seed));
	return {
		items,
		async getItemAsync(key) {
			return items.get(key) ?? null;
		},
		async setItemAsync(key, value) {
			items.set(key, value);
		},
		async deleteItemAsync(key) {
			items.delete(key);
		},
	};
}

/**
 * The platform adapter.
 *
 * `expo-secure-store` is imported lazily so that Node (unit tests, the smoke
 * script) never resolves it: the module graph stays runnable outside a phone
 * without a stub of the native module.
 */
export async function expoSecureStore(): Promise<SecureStoreAdapter> {
	/* Lazy import so Node (tests, scripts) never loads the native module. The
	 * compiler cannot know the module's shape until it resolves at runtime, so the
	 * subset used is declared here and each function is checked before it is called. */
	const module = (await import("expo-secure-store")) as unknown as {
		getItemAsync: (
			key: string,
			options?: SecureStoreOptions,
		) => Promise<string | null>;
		setItemAsync: (
			key: string,
			value: string,
			options?: SecureStoreOptions,
		) => Promise<void>;
		deleteItemAsync: (
			key: string,
			options?: SecureStoreOptions,
		) => Promise<void>;
		WHEN_UNLOCKED_THIS_DEVICE_ONLY: string;
	};
	return {
		getItemAsync: (key, options) => module.getItemAsync(key, options),
		setItemAsync: (key, value, options) =>
			module.setItemAsync(key, value, options),
		deleteItemAsync: (key, options) => module.deleteItemAsync(key, options),
	};
}

/**
 * The class for items the app must read in the BACKGROUND: the Radient grant,
 * the tunnel session, the startup-authorization record and the private-data key.
 *
 * `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`: readable from the first unlock after a
 * reboot until the next reboot, so a TestFlight update or a silent push that
 * relaunches the app on a locked phone can still read the reader's sign-in.
 * `THIS_DEVICE_ONLY` is kept, so an encrypted backup still cannot carry these to
 * another phone. The owner chose this trade on 2026-11-16 (task "Keep sign-in
 * and settings across updates": "Use AFTER_FIRST_UNLOCK where background access
 * is needed"), superseding the cold start's earlier note that declined it.
 */
export async function backgroundReadableAccessibility(): Promise<string> {
	const module = (await import("expo-secure-store")) as unknown as {
		AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: string;
	};
	return module.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
}

/** The accessibility level every write uses, read from the platform so a future
 *  Expo rename fails at the import rather than silently downgrading. */
export async function thisDeviceOnlyAccessibility(): Promise<string> {
	/* Lazy import so Node (tests, scripts) never loads the native module. The
	 * compiler cannot know the module's shape until it resolves at runtime, so the
	 * subset used is declared here and each function is checked before it is called. */
	const module = (await import("expo-secure-store")) as unknown as {
		WHEN_UNLOCKED_THIS_DEVICE_ONLY: string;
	};
	return module.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
}

/* --------------------------------------------------- app shape ↔ stored shape */

/**
 * The two bridges between the connection layer's WORKING shapes and the records
 * this module stores.
 *
 * They live here because this is the one file that knows both: `radient-oauth.ts`
 * and `tunnel-session.ts` deliberately say nothing about the keystore, and a caller
 * that built a record inline would be a second place the field names could drift from
 * the parser's. Every value crosses unchanged — `expires_at` already carries the
 * access-token skew on the app's side, so neither direction re-derives an expiry.
 *
 * `import type` only: these are shapes, not behaviour, so the module keeps its
 * property of loading in Node with no React Native and no cycle.
 */
export function oauthSetFromTokens(tokens: RadientTokens): RadientOAuthSet {
	return {
		access: tokens.access,
		refresh: tokens.refresh,
		expires_at: tokens.expires_at,
		account_label: tokens.account_label,
		/* Only when known: a lossless round trip (an absent id stays absent). */
		...(tokens.account_id != null ? { account_id: tokens.account_id } : {}),
		scope: tokens.scope,
		token_type: tokens.token_type,
	};
}

export function tokensFromOauthSet(set: RadientOAuthSet): RadientTokens {
	return {
		access: set.access,
		refresh: set.refresh,
		expires_at: set.expires_at,
		account_label: set.account_label,
		...(set.account_id != null ? { account_id: set.account_id } : {}),
		scope: set.scope,
		token_type: set.token_type,
	};
}

export function tunnelSetFromSession(session: TunnelSession): TunnelSessionSet {
	return {
		grant: session.grant,
		grant_expires_at: session.grantExpiresAt,
		refresh_handle: session.refreshHandle,
		refresh_expires_at: session.refreshExpiresAt,
		hostname: session.hostname,
		tunnel_id: session.tunnelId,
		minted_at: session.mintedAt,
	};
}

export function sessionFromTunnelSet(set: TunnelSessionSet): TunnelSession {
	return {
		grant: set.grant,
		grantExpiresAt: set.grant_expires_at,
		refreshHandle: set.refresh_handle,
		refreshExpiresAt: set.refresh_expires_at,
		hostname: set.hostname,
		tunnelId: set.tunnel_id,
		mintedAt: set.minted_at,
	};
}

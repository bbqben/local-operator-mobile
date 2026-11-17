/**
 * A gateway refusal that is really a blip is retried silently, not shown as a
 * terminal block.
 *
 * Field report (2026-11-17, TestFlight 1157, Mac on lop 0.106.6): Radient's edge
 * WAF rate-limited the operator's home IP. The Mac's 10 s relay-authorization
 * check got `429`, the 0.106.6 gateway classified it as `authorization_refused`,
 * and its 30 s lease ran out. The phone was then served
 * `503 {"reason":"authorization_refused"}` for three requests in under a
 * minute. `REASON_POLICY` maps that reason to the `console` surface with
 * `retry: "never"`, so every stream loop stopped for good: the list loop set
 * `terminal`, the drawer said "Offline. Messages will send when you're back.",
 * the conversation showed "The Radient login may have expired, or this
 * tunnel's billing may be inactive", and nothing retried until the operator
 * acted, 26 minutes later. The login and the billing were both fine.
 *
 * Two readings make that a silent retry here:
 *
 * 1. **`authorization_unavailable`** (local-operator PR #4168): a newer Mac names
 *    the rate-limit case itself. It is in `REASON_POLICY` as the `retry`
 *    surface, so it never reaches this module as a terminal error.
 * 2. **Legacy `authorization_refused` on a route that was recently healthy.** An
 *    older Mac cannot tell a 429 from a real refusal. But a real revocation or
 *    a lapsed plan does not clear by itself in two minutes, while a rate-limit
 *    blip does. So when this route served a frame within
 *    `RECENTLY_HEALTHY_MS`, the refusal is retried with backoff for
 *    `SUSTAINED_REFUSAL_MS` from the FIRST refusal in the run. Past that, the
 *    original terminal error is surfaced unchanged, which is the block a real
 *    refusal has always shown.
 *
 * Why these numbers:
 * - `SUSTAINED_REFUSAL_MS` = 2 min: the threshold the operator asked for ("no
 *   red terminal block unless retries keep failing for … 2+ minutes"). It also
 *   covers the observed run: three refusals 08:56:28–08:57:17, which is 49 s.
 * - `RECENTLY_HEALTHY_MS` = 10 min: the newer Mac's own grace
 *   (`AUTHORIZATION_GRACE_SECONDS = 600` in local-operator `gateway.py`). Past
 *   that, even a new Mac would be refusing on purpose. A cold start that is
 *   refused before it has ever served a frame is NOT softened: nothing shows
 *   that route was ever authorized.
 *
 * Pure: each stream loop owns one `RefusalGrace`, so the list, config and
 * conversation streams decide alike without sharing mutable state.
 */

import { RelayError } from "./errors";

export const SUSTAINED_REFUSAL_MS = 2 * 60_000;
export const RECENTLY_HEALTHY_MS = 10 * 60_000;

/** Reasons a gateway refuses with that an older Mac also used for transient
 *  control-plane trouble (see the module header). Only this one: the others
 *  (`tunnel_not_authorized`, `login_required`, billing) were never produced for
 *  a rate limit, and softening them would hide a real remedy. */
const LEGACY_AMBIGUOUS_REASONS: ReadonlySet<string> = new Set([
	"authorization_refused",
]);

export interface RefusalGrace {
	/** Record a served frame (or an open stream): the route is healthy now. */
	healthy(now?: number): void;
	/**
	 * The error to act on. Either the input unchanged, or a copy re-typed as the
	 * `retry` surface (`after-backoff`), which every loop already reconnects
	 * through silently.
	 */
	decide(error: RelayError, now?: number): RelayError;
	/** Whether the last `decide` softened a refusal: the run is in progress. */
	softening(): boolean;
}

/** Errors `decide` re-typed: identity, never a string tag a server could forge. */
const softenedErrors = new WeakSet<RelayError>();

/** Reasons a newer Mac uses for "Radient gave no definitive answer; I am still
 *  serving on my last good check" (local-operator PR #4168). */
const SILENT_WAIT_REASONS: ReadonlySet<string> = new Set([
	"authorization_unavailable",
]);

/**
 * Whether a gateway refusal is a wait to reconnect through SILENTLY (the
 * conversation's `C2` "Reconnecting…", never the `C6` block that shows the
 * gateway's sentence). True for the new transient reason and for a refusal
 * `decide` softened; false for every other gateway refusal, including the
 * `retry`-surface ones whose sentence the reader should see
 * (`authorization_deferred`).
 */
export function isSilentGatewayWait(error: RelayError): boolean {
	if (error.kind !== "gateway-refused") return false;
	if (softenedErrors.has(error)) return true;
	const reason = error.reason ?? error.reasonRaw;
	return reason !== undefined && SILENT_WAIT_REASONS.has(reason);
}

export function createRefusalGrace(
	options: { sustainedMs?: number; healthyMs?: number } = {},
): RefusalGrace {
	const sustainedMs = options.sustainedMs ?? SUSTAINED_REFUSAL_MS;
	const healthyMs = options.healthyMs ?? RECENTLY_HEALTHY_MS;
	let lastHealthyAt: number | null = null;
	let firstRefusedAt: number | null = null;
	let softened = false;
	return {
		healthy(now = Date.now()) {
			lastHealthyAt = now;
			firstRefusedAt = null;
			softened = false;
		},
		decide(error, now = Date.now()) {
			softened = false;
			const reason = error.reason ?? error.reasonRaw;
			if (
				error.kind !== "gateway-refused" ||
				reason === undefined ||
				!LEGACY_AMBIGUOUS_REASONS.has(reason)
			)
				return error;
			if (lastHealthyAt === null) return error;
			firstRefusedAt ??= now;
			/* Measured against the last frame BEFORE the run began, so a long run
			 * cannot keep itself "recently healthy". */
			if (firstRefusedAt - lastHealthyAt > healthyMs) return error;
			if (now - firstRefusedAt >= sustainedMs) return error;
			softened = true;
			const soft = new RelayError(error.kind, error.message, {
				status: error.status,
				detail: error.detail,
				serverError: error.serverError,
				code: error.code,
				reason: error.reason,
				reasonRaw: error.reasonRaw,
				relayStateKind: error.relayStateKind,
				retryAfterMs: error.retryAfterMs,
				envelope: error.envelope,
				diagnostic: error.diagnostic ?? "refusal_softened_recently_healthy",
				retry: "after-backoff",
				surface: "retry",
				cause: error,
			});
			softenedErrors.add(soft);
			return soft;
		},
		softening: () => softened,
	};
}

/**
 * Whether a loop that STOPPED on this error may be re-armed by a wake
 * (foreground, a manual kick). A gateway refusal is the computer's current
 * answer and can change without anything on the phone changing, so one reopen
 * on foreground is cheap and is how a stuck "Offline" clears by itself. Phone
 * authentication (401, the sign-in and password surfaces) cannot change that
 * way, and re-arming it would only repeat the 401.
 */
export function rearmableOnWake(error: RelayError | null): boolean {
	return error !== null && error.kind === "gateway-refused";
}

/**
 * Starting a new chat AS an agent or a team: the decisions behind the home's
 * identity pill and its "Start this chat with" sheet.
 *
 * WHY THIS EXISTS. The operator: "There doesn't seem to be any way to select a
 * team/agent from new chat in the mobile app … make this available to be able to
 * start a conversation with a team enabled". local-operator #4367 gave the relay
 * the means — `GET /api/start-targets` lists what a chat may be bound to, and
 * `POST /api/sessions/start` takes an optional, mutually exclusive `agent` or
 * `team`, writing the session's `attachment.json` before the child spawns so the
 * first turn already runs as that identity (the desktop's own create path).
 *
 * THE ONE HAZARD. Both are licensed by `capabilities.session_start.agent/team`.
 * A relay older than #4367 reads the UNKEYED start (the one this app sends) with
 * `body.get` and silently DROPS an unknown field, so a phone that sent `team`
 * blind would start an UNBOUND chat while its pill said "Lopdev". Every function
 * here that can put a field on the wire therefore takes the support reading and
 * emits nothing without it — and `null` (the capabilities frame not read yet) is
 * its own reading, never "supported".
 *
 * Pure (no React Native), so the rules are asserted in Node
 * (`start-targets.test.ts`); `home-pickers.tsx` only lays the sheet out.
 * Design: the identity-picker spec, decisions D-S1..D-S26.
 */
import type { Capabilities, Payload } from "@/contracts";
import { MODEL_SEARCH_THRESHOLD } from "@/features/home/picker-model";
import { t } from "@/i18n";
import type { StartSessionRequest } from "@/relay/endpoints";
import { isRelayError, RelayError } from "@/relay/errors";

/** What a new chat starts as. `name` is the wire value the start route takes;
 *  `label` is the relay's painted form, shown to the reader (D-S9). A restored
 *  record carries only the name, so its label falls back to it. */
export type StartTarget = Readonly<{
	kind: "agent" | "team";
	name: string;
	label: string;
}>;

/** Per-kind licence from `capabilities.session_start`, or `null` while the
 *  capabilities frame has not arrived. */
export type StartTargetSupport = Readonly<{ agent: boolean; team: boolean }>;

/** The picker's search appears above the same row count as the model picker's
 *  (D-S13), so the two sheets behave alike. */
export const START_TARGET_SEARCH_THRESHOLD = MODEL_SEARCH_THRESHOLD;

/** The Recent band appears only once the roster is longer than this (D-S12,
 *  a design proposal pending frames): on a short roster every row is already in
 *  view, and repeating three of them is clutter. */
export const RECENT_BAND_MIN_ROSTER = 8;

/** At most this many recents are remembered and shown (D-S12). */
export const RECENT_LIMIT = 3;

/** Each flag counts only when it is literally `true` — the effort flag's rule.
 *  A relay that sends `"yes"` has not licensed anything this build understands. */
export const startTargetSupport = (
	capabilities: Capabilities | null | undefined,
): StartTargetSupport | null => {
	if (capabilities === null || capabilities === undefined) return null;
	const flags = capabilities.session_start;
	return { agent: flags?.agent === true, team: flags?.team === true };
};

/** Whether the picker exists at all: some kind is licensed (D-S15). */
export const startTargetsOffered = (
	support: StartTargetSupport | null,
): boolean => support !== null && (support.agent || support.team);

/** Whether this relay may be sent this target. The single gate for the wire. */
export const startTargetLicensed = (
	target: StartTarget,
	support: StartTargetSupport | null,
): boolean => support?.[target.kind] === true;

/** The start body's target field: `{agent}` or `{team}`, never both (the relay
 *  refuses both with `invalid_start_target`), and nothing unless the reader
 *  chose one AND this relay licenses its kind (D-S16). Absent keeps the body
 *  byte-identical to a pre-#4367 start. */
export const startTargetField = (
	target: StartTarget | null,
	support: StartTargetSupport | null,
): Pick<StartSessionRequest, "agent" | "team"> => {
	if (target === null || !startTargetLicensed(target, support)) return {};
	return target.kind === "agent"
		? { agent: target.name }
		: { team: target.name };
};

/** The target a coordinator record names, or `null`. Used to show a restored
 *  choice on the pill rather than sending something the screen does not show. */
export const targetFromSelection = (
	selection: StartSessionRequest | null | undefined,
): StartTarget | null => {
	if (!selection) return null;
	if (typeof selection.team === "string" && selection.team !== "")
		return { kind: "team", name: selection.team, label: selection.team };
	if (typeof selection.agent === "string" && selection.agent !== "")
		return { kind: "agent", name: selection.agent, label: selection.agent };
	return null;
};

/** One row of the sheet, with what the row draws. */
export type IdentityRow = Readonly<{
	kind: "agent" | "team";
	name: string;
	label: string;
	/** Agent: its description. Team: unused (the subtitle is built from
	 *  `manager`/`memberCount`, D-S14). */
	description: string;
	manager: string | null;
	memberCount: number | null;
	/** With `avatarSha256`, the key to `/v1/agents/{id}/avatar`. */
	agentId: string | null;
	avatarSha256: string | null;
	selected: boolean;
}>;

export type IdentityRoster = Readonly<{
	agents: readonly Omit<IdentityRow, "selected">[];
	teams: readonly Omit<IdentityRow, "selected">[];
	degraded: boolean;
}>;

/** The relay's roster, as the sheet offers it. Builtin profiles are hidden —
 *  the desktop menu's `draftTargetRoster` rule (`source !== "builtin"`), so the
 *  phone offers exactly the agents the desktop does. Catalogue order is kept:
 *  the relay already sorts, and a second sort here would disagree with it. */
export const identityRoster = (
	read: Payload<"startTargets">,
): IdentityRoster => ({
	agents: read.agents
		.filter((agent) => agent.source !== "builtin")
		.map((agent) => ({
			kind: "agent" as const,
			name: agent.name,
			label: agent.label?.trim() || agent.name,
			description: agent.description?.trim() ?? "",
			manager: null,
			memberCount: null,
			agentId: agent.agent_id ?? null,
			avatarSha256: agent.avatar_sha256 ?? null,
		})),
	teams: read.teams.map((team) => ({
		kind: "team" as const,
		name: team.name,
		label: team.label?.trim() || team.name,
		description: team.description?.trim() ?? "",
		manager: team.manager?.trim() || null,
		memberCount: team.member_count ?? null,
		agentId: null,
		avatarSha256: null,
	})),
	degraded: read.degraded,
});

export type IdentityBand = Readonly<{
	kind: "teams" | "agents";
	rows: readonly IdentityRow[];
}>;

export type IdentitySheet = Readonly<{
	/** `null` when an active query does not match "Default agent" (D-S13). */
	defaultRow: Readonly<{ selected: boolean }> | null;
	recent: readonly IdentityRow[];
	bands: readonly IdentityBand[];
	/** Headings only when two bands have rows and no query is active. */
	showHeadings: boolean;
	searchable: boolean;
	/** A clean read with nothing to offer (not a failure). */
	empty: boolean;
	degraded: boolean;
	noMatches: boolean;
}>;

const WHITESPACE = /\s+/;

const sameTarget = (
	a: Pick<StartTarget, "kind" | "name"> | null,
	b: Pick<StartTarget, "kind" | "name">,
): boolean => a !== null && a.kind === b.kind && a.name === b.name;

/**
 * The sheet, in render order (D-S12/D-S13): Default agent, then Recent (≤3,
 * only on a roster longer than `RECENT_BAND_MIN_ROSTER`, only with no query,
 * and not when the recents already cover the whole roster — the desktop
 * identity menu's rule), then Teams, then Agents (teams first, desktop U-2).
 *
 * The Default row is ALWAYS there with no query, so a tap never reflows the
 * list under the reader's finger (the model picker's D1 lesson). A query
 * flattens to one list with no headings and no Recent, and every whitespace
 * token must appear in the row's name, label or description (`filterModels`).
 */
export const identitySheet = (input: {
	roster: IdentityRoster | null;
	query: string;
	recents: readonly StartTarget[];
	chosen: StartTarget | null;
}): IdentitySheet => {
	const { roster, chosen } = input;
	const total = roster ? roster.agents.length + roster.teams.length : 0;
	const tokens = input.query
		.trim()
		.toLowerCase()
		.split(WHITESPACE)
		.filter(Boolean);
	const querying = tokens.length > 0;
	const matches = (text: string) => {
		const haystack = text.toLowerCase();
		return tokens.every((token) => haystack.includes(token));
	};
	const select = (row: Omit<IdentityRow, "selected">): IdentityRow => ({
		...row,
		selected: sameTarget(chosen, row),
	});
	const keep = (row: Omit<IdentityRow, "selected">) =>
		!querying ||
		matches(`${row.name} ${row.label} ${row.description} ${row.manager ?? ""}`);
	const teams = (roster?.teams ?? []).filter(keep).map(select);
	const agents = (roster?.agents ?? []).filter(keep).map(select);
	const bands: IdentityBand[] = [];
	if (teams.length > 0) bands.push({ kind: "teams", rows: teams });
	if (agents.length > 0) bands.push({ kind: "agents", rows: agents });

	let recent: IdentityRow[] = [];
	if (!querying && roster !== null && total > RECENT_BAND_MIN_ROSTER) {
		const offered = [...roster.teams, ...roster.agents];
		/* A name the roster no longer offers is dropped silently (D-S12): a recent
		 *  is a shortcut to a row, never a row of its own. */
		recent = input.recents
			.map((target) => offered.find((row) => sameTarget(target, row)))
			.filter((row): row is Omit<IdentityRow, "selected"> => row !== undefined)
			.slice(0, RECENT_LIMIT)
			.map(select);
		if (recent.length >= total) recent = [];
	}

	const defaultLabel = t("mobile.home.identity.default_agent");
	const defaultRow =
		!querying || matches(defaultLabel) ? { selected: chosen === null } : null;
	return {
		defaultRow,
		recent,
		bands,
		showHeadings: !querying && bands.length > 1,
		searchable: total > START_TARGET_SEARCH_THRESHOLD,
		empty: roster !== null && !roster.degraded && total === 0,
		degraded: roster?.degraded ?? false,
		noMatches: querying && bands.length === 0 && defaultRow === null,
	};
};

/** Remember a pick, most recent first, one entry per target, `RECENT_LIMIT`
 *  long. Clearing back to Default is not a pick and is not remembered. */
export const pushRecent = (
	recents: readonly StartTarget[],
	target: StartTarget,
): StartTarget[] =>
	[target, ...recents.filter((row) => !sameTarget(target, row))].slice(
		0,
		RECENT_LIMIT,
	);

/** The stored recents, read defensively: the file is the phone's own, but a
 *  hand-edited or older shape must read as "none", never throw into a render. */
export const recentsFrom = (raw: string | null): StartTarget[] => {
	if (raw === null) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	const rows: StartTarget[] = [];
	for (const value of parsed) {
		if (typeof value !== "object" || value === null) continue;
		const { kind, name, label } = value as Record<string, unknown>;
		if (kind !== "agent" && kind !== "team") continue;
		if (typeof name !== "string" || name === "") continue;
		rows.push({
			kind,
			name,
			label: typeof label === "string" && label !== "" ? label : name,
		});
	}
	return rows.slice(0, RECENT_LIMIT);
};

/** The preference key recents live under: PER COMPUTER (D-S12), because a
 *  roster is one machine's registries and another's names mean nothing. A
 *  custom route has no tunnel id and shares one slot. */
export const recentsKey = (computer: string | null): string =>
	`home.start-target-recents.${computer ?? "custom"}`;

/** The relay's start-target refusal codes (local-operator #4367,
 *  `start_receipts.py` / `daemon.py` `_resolve_start_target`). */
const START_TARGET_CODES = new Set([
	"invalid_start_target",
	"unknown_start_target",
	"start_target_registry_unavailable",
	"start_target_unsaved",
]);

const refusalSentence = (code: string, name: string): string => {
	switch (code) {
		case "unknown_start_target":
			return t("mobile.home.identity.refused_unknown", { name });
		case "start_target_registry_unavailable":
			return t("mobile.home.identity.refused_registry");
		case "start_target_unsaved":
			return t("mobile.home.identity.refused_unsaved", { name });
		default:
			return t("mobile.home.identity.refused_fallback", { name });
	}
};

/**
 * A start-target refusal, re-dressed as a DEFINITIVE refusal with readable copy;
 * `null` for any other failure (the existing taxonomy keeps deciding those).
 *
 * WHY. The relay answers these as `{error: code, code}`, so the raw code would be
 * the coordinator's "relay's own sentence" — `unknown_start_target` on screen.
 * And two of them are 503s, which the transport taxonomy reads as
 * `computer-offline` → envelope `keep` → the "may have started" HOLD. On the
 * unkeyed start this app sends, every one of them is refused BEFORE a child
 * spawns (validation runs before the id is minted; an unsaved binding returns
 * before `spawn_session`), so nothing exists and the draft must stay
 * correctable (D-S20) rather than locked behind a hold.
 */
export const startTargetRefusal = (
	failure: unknown,
	selection: StartSessionRequest,
): RelayError | null => {
	if (!isRelayError(failure)) return null;
	const code = failure.code;
	if (code === undefined || !START_TARGET_CODES.has(code)) return null;
	const name = selection.team ?? selection.agent ?? "";
	const sentence = refusalSentence(code, name);
	return new RelayError("rejected", sentence, {
		status: failure.status,
		code,
		detail: sentence,
		envelope: "clear",
		retry: "never",
		cause: failure,
	});
};

/** The sentence for a target the connected relay does not (or not yet) license. */
const unlicensedRefusal = (target: StartTarget): RelayError => {
	const sentence = t("mobile.home.identity.refused_unlicensed", {
		name: target.label,
	});
	return new RelayError("rejected", sentence, {
		detail: sentence,
		envelope: "clear",
		retry: "never",
	});
};

/**
 * The licence each relay client last advertised, as a LIVE frame said it.
 *
 * WHY A REGISTER BESIDE THE CLIENT. The home's own gate (`homeStartSelection`)
 * covers what the reader sends from the screen, but the startup coordinator
 * also REPLAYS a restored record on `resume()`, before any screen effect has run
 * — and a restored target is kept on purpose (it is the reader's choice, not an
 * invented value). So the last gate must sit where the bytes leave: the
 * coordinator's `start` dependency (`startup-runtime.ts`). The home publishes
 * the live reading here per client; a client nobody has vouched for yet reads
 * as `null`, and a target sent through it is refused LOCALLY and visibly
 * (contract "PR 2": "fail locally and visibly rather than starting unbound").
 * Weak, so a retired client takes its entry with it.
 */
const licences = new WeakMap<object, StartTargetSupport>();

/** Record what `client`'s relay licenses; `null` forgets it (no live frame). */
export const noteStartTargetSupport = (
	client: object,
	support: StartTargetSupport | null,
): void => {
	if (support === null) licences.delete(client);
	else licences.set(client, support);
};

/**
 * `POST /api/sessions/start` through the target gate: the one path a start body
 * leaves the phone by. A target this relay has not licensed is refused before
 * any request (definitive, so the draft stays correctable); a start-target
 * refusal from the relay is re-dressed by `startTargetRefusal`. A body with no
 * target goes out exactly as before.
 */
export const gatedStart = async <T>(
	client: { startSession(request: StartSessionRequest): Promise<T> },
	selection: StartSessionRequest,
): Promise<T> => {
	const target = targetFromSelection(selection);
	if (
		target !== null &&
		!startTargetLicensed(target, licences.get(client) ?? null)
	)
		throw unlicensedRefusal(target);
	try {
		return await client.startSession(selection);
	} catch (failure) {
		throw startTargetRefusal(failure, selection) ?? failure;
	}
};

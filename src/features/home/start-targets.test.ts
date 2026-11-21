import { describe, expect, it } from "vitest";

import type { Capabilities, Payload } from "@/contracts";
import { parsePayload } from "@/contracts";
import {
	homeStartSelection,
	restoredSupersede,
} from "@/features/home/home-defaults";
import {
	gatedStart,
	identityRoster,
	identitySheet,
	noteStartTargetSupport,
	pushRecent,
	RECENT_BAND_MIN_ROSTER,
	recentsFrom,
	START_TARGET_SEARCH_THRESHOLD,
	type StartTarget,
	startTargetLicensed,
	startTargetRefusal,
	startTargetSupport,
	targetFromSelection,
} from "@/features/home/start-targets";
import {
	StartupCoordinator,
	type StartupRecord,
} from "@/features/new-session/startup-coordinator";
import type { StartSessionRequest } from "@/relay/endpoints";
import { RelayError } from "@/relay/errors";

/**
 * Starting a new chat as an agent or a team (operator: "There doesn't seem to be
 * any way to select a team/agent from new chat in the mobile app").
 *
 * The hazard this file guards is on the WIRE, not on screen: a relay older than
 * local-operator #4367 reads the unkeyed start with `body.get` and silently drops
 * `team`, so a phone that sent it blind would start an UNBOUND chat while its
 * pill named the team. So the capability gate is asserted on the body
 * `POST /api/sessions/start` receives, alongside the sheet's ordering rules.
 */

const LOPDEV: StartTarget = { kind: "team", name: "lopdev", label: "Lopdev" };
const CODER: StartTarget = { kind: "agent", name: "coder", label: "Coder" };
const BOTH = { agent: true, team: true } as const;
const NEITHER = { agent: false, team: false } as const;

const caps = (session_start: Record<string, unknown> | undefined) =>
	({ session_start }) as unknown as Capabilities;

describe("the capability gate (absent → no picker, no field)", () => {
	it("reads each flag only when it is literally true", () => {
		expect(startTargetSupport(null)).toBeNull();
		expect(startTargetSupport(caps(undefined))).toStrictEqual(NEITHER);
		expect(
			startTargetSupport(caps({ version: 1, effort: true })),
		).toStrictEqual(NEITHER);
		expect(startTargetSupport(caps({ agent: true, team: true }))).toStrictEqual(
			BOTH,
		);
		expect(startTargetSupport(caps({ agent: "yes", team: 1 }))).toStrictEqual(
			NEITHER,
		);
	});

	it("parses the capability flags through the real schema", () => {
		// A schema that stripped unknown keys would silently turn the flag off.
		const parsed = parsePayload("startTargets", {
			agents: [],
			teams: [],
		});
		expect(parsed.degraded).toBe(false);
	});

	it("licenses a target only for its own kind", () => {
		expect(startTargetLicensed(LOPDEV, BOTH)).toBe(true);
		expect(startTargetLicensed(LOPDEV, { agent: true, team: false })).toBe(
			false,
		);
		expect(startTargetLicensed(CODER, { agent: true, team: false })).toBe(true);
		expect(startTargetLicensed(CODER, null)).toBe(false);
	});
});

describe("the start body for agent, team and none", () => {
	const base = { cwd: "/tmp", chosenModel: null };

	it("names the team when the reader chose one and the relay licenses it", () => {
		expect(
			homeStartSelection({ ...base, target: LOPDEV, targetSupport: BOTH }),
		).toStrictEqual({ cwd: "/tmp", team: "lopdev" });
	});

	it("names the agent when the reader chose one and the relay licenses it", () => {
		expect(
			homeStartSelection({ ...base, target: CODER, targetSupport: BOTH }),
		).toStrictEqual({ cwd: "/tmp", agent: "coder" });
	});

	it("is byte-identical to today's body when nothing is chosen", () => {
		const body = homeStartSelection({
			...base,
			target: null,
			targetSupport: BOTH,
		});
		expect(JSON.stringify(body)).toBe(JSON.stringify(homeStartSelection(base)));
		expect(body).not.toHaveProperty("agent");
		expect(body).not.toHaveProperty("team");
	});

	it("never sends a field to a relay that did not advertise it", () => {
		for (const support of [NEITHER, null, { agent: true, team: false }]) {
			const body = homeStartSelection({
				...base,
				target: LOPDEV,
				targetSupport: support,
			});
			expect(body).not.toHaveProperty("team");
			expect(body).not.toHaveProperty("agent");
		}
	});

	it("names at most one of agent and team (mutual exclusion)", () => {
		for (const target of [LOPDEV, CODER]) {
			const body = homeStartSelection({
				...base,
				target,
				targetSupport: BOTH,
			}) as StartSessionRequest;
			const named = ["agent", "team"].filter((key) => key in body);
			expect(named).toHaveLength(1);
		}
	});

	it("keeps the key order the restore comparison relies on", () => {
		const body = homeStartSelection({
			cwd: "/tmp",
			chosenModel: {
				selector: "anthropic/opus",
				provider: "anthropic",
				model_id: "opus",
				name: "Opus",
			},
			chosenEffort: "high",
			effortSupported: true,
			target: LOPDEV,
			targetSupport: BOTH,
		});
		expect(Object.keys(body ?? {})).toStrictEqual([
			"cwd",
			"provider",
			"model_id",
			"effort",
			"team",
		]);
	});
});

describe("a restored target (kept, re-gated)", () => {
	const SCOPE = "authorization-a/server-a";

	const startBody = async (input: {
		stored: StartSessionRequest;
		target: StartTarget | null;
		targetSupport: { agent: boolean; team: boolean } | null;
	}): Promise<StartSessionRequest> => {
		let disk: StartupRecord | null = {
			version: 1,
			scope: SCOPE,
			phase: "draft",
			sessionId: null,
			selection: input.stored,
			draft: { text: "", images: [] },
			queue: [],
		};
		const started: StartSessionRequest[] = [];
		let reached!: () => void;
		const arrived = new Promise<void>((resolve) => {
			reached = resolve;
		});
		const coordinator = new StartupCoordinator(SCOPE, {
			store: {
				load: async () => (disk === null ? null : structuredClone(disk)),
				save: async (record) => {
					disk = structuredClone(record);
				},
			},
			start: async (selection) => {
				started.push(selection);
				reached();
				return { session_id: "session-a" };
			},
			send: async () => undefined,
			isCurrent: () => true,
			uuid: () => "00000000-0000-4000-8000-000000000001",
		});
		await coordinator.ready;
		const next = restoredSupersede({
			stored: coordinator.snapshot().selection,
			folders: null,
			chosenModel: null,
			readerApplied: false,
			target: input.target,
			targetSupport: input.targetSupport,
		});
		if (next !== null) await coordinator.configure(next, true);
		coordinator.edit("hello", []);
		await coordinator.enqueue();
		await arrived;
		return started[0] as StartSessionRequest;
	};

	it("survives the coordinator's restore (unlike an invented model)", async () => {
		expect(
			await startBody({
				stored: { cwd: "/tmp", team: "lopdev" },
				target: LOPDEV,
				targetSupport: BOTH,
			}),
		).toStrictEqual({ cwd: "/tmp", team: "lopdev" });
	});

	it("is stripped once the relay is known not to license it", async () => {
		expect(
			await startBody({
				stored: { cwd: "/tmp", team: "lopdev" },
				target: LOPDEV,
				targetSupport: NEITHER,
			}),
		).toStrictEqual({ cwd: "/tmp" });
	});

	it("is left alone while the capability is still unread", () => {
		// Stripping on `null` would lose the reader's choice to a race with the
		// list frame; the send-time gate (`startTargetLicensed`) covers the wire.
		expect(
			restoredSupersede({
				stored: { cwd: "/tmp", team: "lopdev" },
				folders: null,
				chosenModel: null,
				readerApplied: false,
				target: LOPDEV,
				targetSupport: null,
			}),
		).toBeNull();
	});

	it("reads back as the target the record names", () => {
		expect(targetFromSelection({ cwd: "/tmp", team: "lopdev" })).toStrictEqual({
			kind: "team",
			name: "lopdev",
			label: "lopdev",
		});
		expect(targetFromSelection({ cwd: "/tmp", agent: "coder" })).toStrictEqual({
			kind: "agent",
			name: "coder",
			label: "coder",
		});
		expect(targetFromSelection({ cwd: "/tmp" })).toBeNull();
		expect(targetFromSelection(null)).toBeNull();
	});
});

const roster = (agents: number, teams: number): Payload<"startTargets"> =>
	parsePayload("startTargets", {
		agents: Array.from({ length: agents }, (_, index) => ({
			name: `agent-${index}`,
			label: `Agent ${index}`,
			kind: "role",
			source: "installed",
			description: `Does task ${index}`,
			agent_id: null,
			avatar_sha256: null,
		})),
		teams: Array.from({ length: teams }, (_, index) => ({
			name: `team-${index}`,
			label: `Team ${index}`,
			description: "",
			manager: "manager",
			member_count: 3,
		})),
		degraded: false,
	});

describe("the sheet's order and search threshold", () => {
	it("hides builtin profiles, as the desktop menu does", () => {
		const read = parsePayload("startTargets", {
			agents: [
				{ name: "default", source: "builtin" },
				{ name: "coder", source: "installed", label: "Coder" },
			],
			teams: [],
			degraded: false,
		});
		expect(identityRoster(read).agents.map((row) => row.name)).toStrictEqual([
			"coder",
		]);
	});

	it("orders Default, then Teams, then Agents, in catalogue order", () => {
		const sheet = identitySheet({
			roster: identityRoster(roster(2, 2)),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(sheet.bands.map((band) => band.kind)).toStrictEqual([
			"teams",
			"agents",
		]);
		expect(sheet.showHeadings).toBe(true);
		expect(sheet.defaultRow).toStrictEqual({ selected: true });
		expect(sheet.bands[0]?.rows.map((row) => row.name)).toStrictEqual([
			"team-0",
			"team-1",
		]);
	});

	it("omits an empty band and the headings when only one band has rows", () => {
		const sheet = identitySheet({
			roster: identityRoster(roster(3, 0)),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(sheet.bands.map((band) => band.kind)).toStrictEqual(["agents"]);
		expect(sheet.showHeadings).toBe(false);
	});

	it("shows search only above the model picker's threshold", () => {
		expect(START_TARGET_SEARCH_THRESHOLD).toBe(12);
		const at = identitySheet({
			roster: identityRoster(roster(10, 2)),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(at.searchable).toBe(false);
		const over = identitySheet({
			roster: identityRoster(roster(11, 2)),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(over.searchable).toBe(true);
	});

	it("filters every whitespace token over name, label and description, flat", () => {
		const sheet = identitySheet({
			roster: identityRoster(roster(20, 3)),
			query: "task 1",
			recents: [CODER],
			chosen: null,
		});
		expect(sheet.showHeadings).toBe(false);
		expect(sheet.recent).toStrictEqual([]);
		// The Default row shows only if it matches the query.
		expect(sheet.defaultRow).toBeNull();
		const names = sheet.bands.flatMap((band) => band.rows.map((r) => r.name));
		expect(names).toContain("agent-1");
		expect(names).toContain("agent-10");
		expect(names).not.toContain("agent-2");
		expect(sheet.noMatches).toBe(false);
		expect(
			identitySheet({
				roster: identityRoster(roster(20, 3)),
				query: "zzz",
				recents: [],
				chosen: null,
			}).noMatches,
		).toBe(true);
	});

	it("shows Recent only on a larger roster, and only for names it still offers", () => {
		const recents: StartTarget[] = [
			{ kind: "team", name: "team-1", label: "Team 1" },
			{ kind: "agent", name: "gone", label: "Gone" },
			{ kind: "agent", name: "agent-3", label: "Agent 3" },
		];
		const small = identitySheet({
			roster: identityRoster(roster(RECENT_BAND_MIN_ROSTER - 2, 2)),
			query: "",
			recents,
			chosen: null,
		});
		expect(small.recent).toStrictEqual([]);
		const large = identitySheet({
			roster: identityRoster(roster(10, 2)),
			query: "",
			recents,
			chosen: null,
		});
		expect(large.recent.map((row) => row.name)).toStrictEqual([
			"team-1",
			"agent-3",
		]);
		// Repeats, never removed from below.
		expect(
			large.bands.flatMap((band) => band.rows.map((r) => r.name)),
		).toContain("agent-3");
	});

	it("marks exactly one row selected, by kind and name", () => {
		const sheet = identitySheet({
			roster: identityRoster(
				parsePayload("startTargets", {
					agents: [{ name: "lopdev", source: "installed" }],
					teams: [{ name: "lopdev" }],
					degraded: false,
				}),
			),
			query: "",
			recents: [],
			chosen: LOPDEV,
		});
		expect(sheet.defaultRow).toStrictEqual({ selected: false });
		const selected = sheet.bands.flatMap((band) =>
			band.rows.filter((row) => row.selected).map((row) => row.kind),
		);
		expect(selected).toStrictEqual(["team"]);
	});
});

describe("the degraded roster", () => {
	it("is a read failure, not an empty roster", () => {
		const read = parsePayload("startTargets", {
			agents: [],
			teams: [],
			degraded: true,
		});
		const sheet = identitySheet({
			roster: identityRoster(read),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(sheet.degraded).toBe(true);
		expect(sheet.empty).toBe(false);
		expect(sheet.defaultRow).toStrictEqual({ selected: true });
	});

	it("is empty only when the relay read cleanly and found nothing", () => {
		const sheet = identitySheet({
			roster: identityRoster(roster(0, 0)),
			query: "",
			recents: [],
			chosen: null,
		});
		expect(sheet.empty).toBe(true);
		expect(sheet.degraded).toBe(false);
	});
});

describe("recents", () => {
	it("keeps at most three, most recent first, one per target", () => {
		let list: StartTarget[] = [];
		for (const name of ["a", "b", "c", "d", "b"])
			list = pushRecent(list, { kind: "agent", name, label: name });
		expect(list.map((row) => row.name)).toStrictEqual(["b", "d", "c"]);
	});

	it("reads a stored list defensively", () => {
		expect(recentsFrom(null)).toStrictEqual([]);
		expect(recentsFrom("not json")).toStrictEqual([]);
		expect(
			recentsFrom(
				JSON.stringify([
					{ kind: "team", name: "lopdev", label: "Lopdev" },
					{ kind: "robot", name: "x" },
					{ kind: "agent", name: "" },
				]),
			),
		).toStrictEqual([LOPDEV]);
	});
});

describe("refusal mapping", () => {
	const refusal = (status: number, code: string) =>
		new RelayError(status === 503 ? "computer-offline" : "rejected", code, {
			status,
			code,
			serverError: code,
		});

	it.each([
		[404, "unknown_start_target"],
		[400, "invalid_start_target"],
		[503, "start_target_registry_unavailable"],
		[503, "start_target_unsaved"],
	])("turns %i %s into a definitive, readable refusal", (status, code) => {
		const mapped = startTargetRefusal(refusal(status, code), {
			cwd: "/tmp",
			team: "lopdev",
		});
		expect(mapped).not.toBeNull();
		// Definitive: nothing was created, so the draft stays correctable rather
		// than sitting in the "may have started" HOLD a 503 would otherwise get.
		expect(mapped?.envelope).toBe("clear");
		expect(mapped?.code).toBe(code);
		expect(mapped?.displayableMessage).not.toContain("_");
		expect(mapped?.displayableMessage.length).toBeGreaterThan(10);
	});

	it("names the chosen target in the unknown-target sentence", () => {
		expect(
			startTargetRefusal(refusal(404, "unknown_start_target"), {
				cwd: "/tmp",
				team: "lopdev",
			})?.displayableMessage,
		).toContain("lopdev");
	});

	it("leaves every other failure to the existing taxonomy", () => {
		expect(
			startTargetRefusal(refusal(400, "invalid_start_request"), {
				cwd: "/tmp",
				team: "lopdev",
			}),
		).toBeNull();
		expect(startTargetRefusal(new Error("boom"), { cwd: "/tmp" })).toBeNull();
	});
});

describe("the send-time gate (restored records replay before the screen renders)", () => {
	const client = () => {
		const sent: StartSessionRequest[] = [];
		return {
			sent,
			startSession: async (request: StartSessionRequest) => {
				sent.push(request);
				return { session_id: "s" };
			},
		};
	};

	it("refuses a target locally, sending nothing, until a live frame licensed it", async () => {
		const relay = client();
		const failure = await gatedStart(relay, {
			cwd: "/tmp",
			team: "lopdev",
		}).catch((error: unknown) => error);
		expect(relay.sent).toStrictEqual([]);
		expect(failure).toBeInstanceOf(RelayError);
		// Definitive: the coordinator moves to `refused`, the draft stays.
		expect((failure as RelayError).envelope).toBe("clear");
		expect((failure as RelayError).displayableMessage).toContain("lopdev");
	});

	it("refuses a kind the relay does not license", async () => {
		const relay = client();
		noteStartTargetSupport(relay, { agent: true, team: false });
		await expect(
			gatedStart(relay, { cwd: "/tmp", team: "lopdev" }),
		).rejects.toBeInstanceOf(RelayError);
		expect(relay.sent).toStrictEqual([]);
	});

	it("sends a licensed target, and an untargeted body always", async () => {
		const relay = client();
		await gatedStart(relay, { cwd: "/tmp" });
		noteStartTargetSupport(relay, BOTH);
		await gatedStart(relay, { cwd: "/tmp", team: "lopdev" });
		noteStartTargetSupport(relay, null);
		await gatedStart(relay, { cwd: "/tmp" });
		expect(relay.sent).toStrictEqual([
			{ cwd: "/tmp" },
			{ cwd: "/tmp", team: "lopdev" },
			{ cwd: "/tmp" },
		]);
	});

	it("re-dresses the relay's own start-target refusal", async () => {
		const relay = {
			startSession: async () => {
				throw new RelayError("computer-offline", "start_target_unsaved", {
					status: 503,
					code: "start_target_unsaved",
					serverError: "start_target_unsaved",
				});
			},
		};
		noteStartTargetSupport(relay, BOTH);
		const failure = (await gatedStart(relay, {
			cwd: "/tmp",
			agent: "coder",
		}).catch((error: unknown) => error)) as RelayError;
		expect(failure.envelope).toBe("clear");
		expect(failure.code).toBe("start_target_unsaved");
	});
});

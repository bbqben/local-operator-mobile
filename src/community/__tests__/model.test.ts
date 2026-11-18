import { describe, expect, it } from "vitest";
import { CommunityError } from "@/community/client";
import type { Bootstrap, CommunityMessage } from "@/community/contract";
import {
	attemptStateFromError,
	communityGroup,
	communityUnread,
	guidelinesStep,
	hoursLeft,
	mergeMessages,
	openingSelection,
	pendingApprovals,
	postingBlock,
	retryKeepsKey,
} from "@/community/model";

const org = (tenantId: string, invited = false) => ({ tenantId, invited });
const community = (communityId: string, unread = 0) => ({
	communityId,
	name: communityId,
	unread,
	readOnly: false,
});

describe("opening selection (Amendment A §3)", () => {
	it("a pending private invitation wins even over this session's community", () => {
		expect(
			openingSelection({
				organizations: [org("minerva"), org("acme", true)],
				communities: [community("loc")],
				session: { kind: "community", communityId: "loc" },
			}),
		).toEqual({ kind: "private", tenantId: "acme" });
	});

	it("this session's pick stands until restart (memory only)", () => {
		expect(
			openingSelection({
				organizations: [org("minerva")],
				communities: [community("loc")],
				session: { kind: "community", communityId: "loc" },
				defaultTenantId: "minerva",
			}),
		).toEqual({ kind: "community", communityId: "loc" });
	});

	it("without a session pick, the default private org opens, never the community", () => {
		expect(
			openingSelection({
				organizations: [org("acme"), org("minerva")],
				communities: [community("loc")],
				defaultTenantId: "minerva",
			}),
		).toEqual({ kind: "private", tenantId: "minerva" });
		expect(
			openingSelection({
				organizations: [org("acme")],
				communities: [community("loc")],
			}),
		).toEqual({ kind: "private", tenantId: "acme" });
	});

	it("a stale session pick (left the community) falls through to the rules", () => {
		expect(
			openingSelection({
				organizations: [org("acme")],
				communities: [],
				session: { kind: "community", communityId: "gone" },
			}),
		).toEqual({ kind: "private", tenantId: "acme" });
	});

	it("a community is the launch default only with no private org at all", () => {
		expect(
			openingSelection({ organizations: [], communities: [community("loc")] }),
		).toEqual({ kind: "community", communityId: "loc" });
		expect(openingSelection({ organizations: [], communities: [] })).toBeNull();
	});
});

describe("Communities group", () => {
	it("is drawn with the flag on even with nothing joined (Browse stays reachable)", () => {
		expect(communityGroup({ communities: [], enabled: true }).show).toBe(true);
		expect(communityGroup({ communities: [], enabled: false }).show).toBe(
			false,
		);
	});

	it("keeps a joined community reachable when the flag is off", () => {
		expect(
			communityGroup({ communities: [community("loc")], enabled: false }).show,
		).toBe(true);
	});

	it("adds search past six joined, decided on the joined count", () => {
		const many = Array.from({ length: 7 }, (_, i) => community(`c${i}`));
		const group = communityGroup({
			communities: many,
			enabled: true,
			query: "c3",
		});
		expect(group.search).toBe(true);
		expect(group.rows.map((r) => r.communityId)).toEqual(["c3"]);
	});

	it("a community's unread is its own: channels it sits in plus DMs", () => {
		expect(
			communityUnread(
				[
					{ unread: 3, member: true },
					{ unread: 9, member: false },
					{ unread: 1 },
				],
				[{ unread: 2 }],
			),
		).toBe(6);
	});
});

describe("guidelines", () => {
	const boot = (
		membership: Bootstrap["membership"],
		state: "active" | "read_only" = "active",
	): Bootstrap => ({
		community_id: "loc",
		community: {
			id: "loc",
			slug: "local-operator",
			name: "Local Operator Community",
			state,
		},
		guidelines: { version: "2026-11", text: "Be kind." },
		membership,
	});
	it("non-member: join; stale acceptance: re-accept; current: none", () => {
		expect(guidelinesStep(boot(null))).toBe("join");
		expect(
			guidelinesStep(
				boot({
					status: "active",
					guidelines_version: "2026-10",
					accepted_at: "x",
				}),
			),
		).toBe("reaccept");
		expect(
			guidelinesStep(
				boot({
					status: "active",
					guidelines_version: "2026-11",
					accepted_at: "x",
				}),
			),
		).toBe("none");
	});
	it("a read-only community cannot be joined", () => {
		expect(guidelinesStep(boot(null, "read_only"))).toBe("closed");
	});
});

describe("posting", () => {
	it("staff-only channels refuse members but not moderators", () => {
		expect(
			postingBlock(
				{ posting: "staff" },
				{ role: "member", readOnlyCommunity: false },
			),
		).toBe("staff_only");
		expect(
			postingBlock(
				{ posting: "staff" },
				{ role: "moderator", readOnlyCommunity: false },
			),
		).toBeNull();
		expect(
			postingBlock(
				{ locked: true },
				{ role: "staff", readOnlyCommunity: false },
			),
		).toBe("locked");
		expect(postingBlock({}, { role: "member", readOnlyCommunity: true })).toBe(
			"read_only",
		);
	});
});

describe("history", () => {
	const m = (id: string, seq: number, revision = 0): CommunityMessage => ({
		id,
		conversation_id: "c",
		seq,
		revision,
		author: { kind: "human", display_name: "Ada" },
		text: `${id}@${revision}`,
		created_at: "2026-11-18T00:00:00Z",
	});
	it("merges newest-first pages oldest-first and keeps the newest revision", () => {
		const merged = mergeMessages(
			[m("a", 1), m("b", 2)],
			[m("c", 3), m("b", 2, 1)],
		);
		expect(merged.map((x) => x.text)).toEqual(["a@0", "b@1", "c@0"]);
	});
});

describe("attempt outcomes (sender only)", () => {
	const now = 1_000_000;
	it("refused keeps category and reference; never retried under the same key", () => {
		const state = attemptStateFromError(
			new CommunityError({
				kind: "refused",
				refusal: {
					status: "refused",
					category: "harassment_or_abuse",
					reference: "MOD-AAAA-BBBB",
				},
			}),
			now,
		);
		expect(state).toEqual({
			kind: "refused",
			category: "harassment_or_abuse",
			reference: "MOD-AAAA-BBBB",
		});
		expect(retryKeepsKey(state)).toBe(false);
	});
	it("a limit carries when Retry may run and keeps the key", () => {
		const state = attemptStateFromError(
			new CommunityError({ kind: "rate_limited", retryAfterMs: 5_000 }),
			now,
		);
		expect(state).toEqual({ kind: "limited", retryAt: now + 5_000 });
		expect(retryKeepsKey(state)).toBe(true);
	});
	it.each([
		["moderation_unavailable", "unavailable"],
		["auth_unavailable", "unavailable"],
		["images_unavailable", "images_unavailable"],
		["guidelines_changed", "guidelines"],
		["forbidden", "forbidden"],
		["unreachable", "failed"],
	] as const)("%s → %s", (kind, expected) => {
		expect(attemptStateFromError(new CommunityError({ kind }), now).kind).toBe(
			expected,
		);
	});
});

describe("agent approvals", () => {
	const stub = (
		id: string,
		state: "pending" | "declined",
		expiresInH: number,
	) => ({
		approval_id: id,
		target_kind: "channel" as const,
		channel_id: "feedback",
		state,
		created_at: "x",
		expires_at: new Date(
			Date.UTC(2026, 10, 18) + expiresInH * 3_600_000,
		).toISOString(),
	});
	const now = Date.UTC(2026, 10, 18);
	it("lists only pending, unexpired stubs, soonest first", () => {
		const list = pendingApprovals(
			[
				stub("late", "pending", 20),
				stub("done", "declined", 5),
				stub("soon", "pending", 2),
				stub("old", "pending", -1),
			],
			now,
		);
		expect(list.map((a) => a.approval_id)).toEqual(["soon", "late"]);
	});
	it("rounds hours up and never shows zero while pending", () => {
		expect(hoursLeft(stub("a", "pending", 24).expires_at, now)).toBe(24);
		expect(hoursLeft(new Date(now + 60_000).toISOString(), now)).toBe(1);
	});
});

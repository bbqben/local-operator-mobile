/**
 * Team Bridge reactions (spec "Mobile Team Bridge: reactions and
 * start-a-thread", slice PR b): the pure model ported from the desktop, the
 * wire (contract + client), and the store's toggle — optimistic rows, the one
 * in-flight write per message, exact rollback, the poll-vs-pending guard and
 * the "hub without the route" switch.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createHubClient,
	type HubClient,
	HubError,
} from "@/team-bridge/client";
import { messageSchema, type Reaction } from "@/team-bridge/contract";
import {
	clearTeamBridgeEmoji,
	teamBridgeFrequentEmoji,
} from "@/team-bridge/emoji-usage";
import {
	firstEmoji,
	frequentEmoji,
	isSingleEmoji,
	QUICK_EMOJI,
	reactionAdds,
	recordEmojiUsage,
	toggleReaction,
} from "@/team-bridge/reactions";
import { replyThreadKey } from "@/team-bridge/reply-threads";
import {
	createTeamBridgeStore,
	reactionKey,
	type ThreadData,
	threadKey,
} from "@/team-bridge/store";
import { message, SELF, TENANT } from "./fixtures";

const THUMBS = "👍";
const PARTY = "🎉";
const r = (
	emoji: string,
	count: number,
	mine = false,
	labels: string[] = [],
): Reaction => ({ emoji, count, reacted_by_me: mine, sample_labels: labels });

describe("toggleReaction (the desktop's projection, ported)", () => {
	it("absent → appended as mine with count 1", () => {
		expect(toggleReaction([r(THUMBS, 2)], PARTY)).toEqual([
			r(THUMBS, 2),
			r(PARTY, 1, true),
		]);
	});
	it("another's → +1 and mine; mine → -1 and not mine", () => {
		const up = toggleReaction([r(THUMBS, 2, false, ["Ada"])], THUMBS);
		expect(up).toEqual([r(THUMBS, 3, true, ["Ada"])]);
		expect(toggleReaction(up, THUMBS)).toEqual([r(THUMBS, 2, false, ["Ada"])]);
	});
	it("my sole reaction → the pill is removed", () => {
		expect(toggleReaction([r(PARTY, 1, true), r(THUMBS, 1)], PARTY)).toEqual([
			r(THUMBS, 1),
		]);
	});
	it("reactionAdds: PUT unless the emoji is already mine", () => {
		expect(reactionAdds([r(THUMBS, 1)], THUMBS)).toBe(true);
		expect(reactionAdds([r(THUMBS, 1, true)], THUMBS)).toBe(false);
		expect(reactionAdds([], PARTY)).toBe(true);
	});
});

describe("frequent emoji (decayed usage, per account)", () => {
	const DAY = 86_400_000;
	it("with no usage, the quick set in the desktop's order", () => {
		expect(frequentEmoji({}, 0)).toEqual([...QUICK_EMOJI]);
	});
	it("ranks used emoji first and tops up from the quick set, eight in all", () => {
		let usage = recordEmojiUsage({}, "🦄", 0);
		usage = recordEmojiUsage(usage, "🦄", 0);
		usage = recordEmojiUsage(usage, "🔥", 0);
		const list = frequentEmoji(usage, 0);
		expect(list.slice(0, 2)).toEqual(["🦄", "🔥"]);
		expect(list).toHaveLength(8);
		expect(new Set(list).size).toBe(8);
	});
	it("halves a score every 30 days, so recent use beats old habit", () => {
		let usage = recordEmojiUsage({}, "🦄", 0);
		usage = recordEmojiUsage(usage, "🦄", 0); // score 2 at t=0
		usage = recordEmojiUsage(usage, "🐙", 61 * DAY); // score 1 at 61 d
		// 🦄 decays to 2 × 2^(-61/30) ≈ 0.49 < 1.
		expect(frequentEmoji(usage, 61 * DAY)[0]).toBe("🐙");
	});
});

describe("isSingleEmoji / firstEmoji (the keyboard picker's filter)", () => {
	it.each([
		["👍", true],
		["👍🏽", true],
		["❤️", true],
		["👨‍👩‍👧", true],
		["1️⃣", true],
		["🇫🇷", true],
		["a", false],
		["1", false],
		["#", false],
		["👍👍", false],
		["", false],
	])("%s → %s", (value, expected) => {
		expect(isSingleEmoji(value)).toBe(expected);
	});
	it("takes the first emoji grapheme and ignores letters around it", () => {
		expect(firstEmoji("ab🎉c")).toBe("🎉");
		expect(firstEmoji("hello")).toBeNull();
	});
});

describe("contract: reactions on a message", () => {
	const base = message(1, SELF, "2026-11-19T09:00:00Z");
	it("absent on an older hub: the message parses with no reactions", () => {
		expect(messageSchema.parse(base).reactions).toBeUndefined();
	});
	it("a malformed list costs the pills, never the message", () => {
		const parsed = messageSchema.parse({ ...base, reactions: "nope" });
		expect(parsed.id).toBe(base.id);
		expect(parsed.reactions).toBeUndefined();
	});
	it("trims to the desktop's bounds (≤ 50 rows, ≤ 3 labels) rather than failing", () => {
		const rows = Array.from({ length: 60 }, (_, i) => ({
			emoji: String.fromCodePoint(0x1f600 + i),
			count: 1,
			reacted_by_me: false,
			sample_labels: ["a", "b", "c", "d"],
		}));
		const parsed = messageSchema.parse({ ...base, reactions: rows });
		expect(parsed.reactions).toHaveLength(50);
		expect(parsed.reactions?.[0]?.sample_labels).toEqual(["a", "b", "c"]);
	});
});

describe("client.react: the wire (spec §2.1)", () => {
	const answer = {
		msg: "ok",
		result: { message_id: "bcm_1", reactions: [r(THUMBS, 1, true)] },
	};
	const rig = () => {
		const calls: { url: string; init: RequestInit }[] = [];
		const client = createHubClient({
			accessToken: async () => "token-a",
			baseUrl: "https://hub.example/",
			fetchImpl: (async (url: string, init: RequestInit) => {
				calls.push({ url: String(url), init });
				return new Response(JSON.stringify(answer), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}) as unknown as typeof fetch,
		});
		return { client, calls };
	};
	it("add: PUT with tenant_id in the body, the emoji percent-encoded", async () => {
		const { client, calls } = rig();
		const out = await client.react(TENANT, "bcv_1", "bcm_1", THUMBS, true);
		expect(out.reactions).toEqual([r(THUMBS, 1, true)]);
		expect(calls[0]?.init.method).toBe("PUT");
		expect(calls[0]?.url).toContain(
			`/conversations/bcv_1/messages/bcm_1/reactions/${encodeURIComponent(THUMBS)}`,
		);
		const body = JSON.parse(String(calls[0]?.init.body));
		expect(body).toEqual({ tenant_id: TENANT });
		// The human plane never carries the agent identity or the daemon receipt.
		expect(body).not.toHaveProperty("actor_endpoint_id");
		expect(body).not.toHaveProperty("expected_account_id");
	});
	it("remove: DELETE with tenant_id in the QUERY and no body", async () => {
		const { client, calls } = rig();
		await client.react(TENANT, "bcv_1", "bcm_1", THUMBS, false);
		expect(calls[0]?.init.method).toBe("DELETE");
		expect(new URL(calls[0]?.url ?? "").searchParams.get("tenant_id")).toBe(
			TENANT,
		);
		expect(calls[0]?.init.body ?? null).toBeNull();
	});
	it("NFC-normalises the emoji, so one glyph typed two ways is one pill", async () => {
		const { client, calls } = rig();
		// "é" decomposed (e + U+0301) — any NFD input makes the point.
		await client.react(TENANT, "c", "m", "e\u0301", true);
		expect(calls[0]?.url).toContain(`/reactions/${encodeURIComponent("é")}`);
	});
});

/* ---- the store ------------------------------------------------------ */

const CONV = "bcv_channel_general";
const target = { tenantId: TENANT, conversationId: CONV, messageId: "bcm_1" };
const deferred = <T>() => {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

function rigStore(react: HubClient["react"]) {
	const hub = { react: vi.fn(react) } as unknown as HubClient;
	const bridge = createTeamBridgeStore({
		hub: () => hub,
		accessToken: async () => "t",
		now: () => 1_000,
	});
	const held = message(1, "acct_ada", "2026-11-19T09:00:00Z", {
		reactions: [r(THUMBS, 2, false, ["Ada", "Ben"])],
	});
	bridge.store.setState({
		selfAccountId: SELF,
		threads: {
			[threadKey(TENANT, CONV)]: {
				messages: [held],
				state: "ready",
				error: null,
				hasMore: false,
				loadingOlder: false,
				olderError: null,
			},
		},
	});
	const timelineRows = () =>
		bridge.store.getState().threads[threadKey(TENANT, CONV)]?.messages[0]
			?.reactions;
	const shown = () =>
		bridge.store.getState().reactionPending[reactionKey(target)]?.rows ??
		timelineRows();
	return { bridge, hub, held, timelineRows, shown };
}

afterEach(() => clearTeamBridgeEmoji());

describe("store.toggleReaction (spec §4.8)", () => {
	it("shows the optimistic +1 at once, then the server's summary replaces it", async () => {
		const write = deferred<{ message_id: string; reactions: Reaction[] }>();
		const { bridge, hub, shown, timelineRows } = rigStore(() => write.promise);
		const outcome = bridge.actions.toggleReaction(target, THUMBS);
		expect(shown()).toEqual([r(THUMBS, 3, true, ["Ada", "Ben"])]);
		// The held message is untouched until the write settles.
		expect(timelineRows()).toEqual([r(THUMBS, 2, false, ["Ada", "Ben"])]);
		expect(hub.react).toHaveBeenCalledWith(TENANT, CONV, "bcm_1", THUMBS, true);
		const served = [r(THUMBS, 3, true, ["Sam", "Ada", "Ben"])];
		write.resolve({ message_id: "bcm_1", reactions: served });
		expect(await outcome).toBe("added");
		expect(timelineRows()).toEqual(served);
		expect(bridge.store.getState().reactionPending).toEqual({});
	});

	it("a confirmed ADD feeds the quick row for this account; a remove does not", async () => {
		const { bridge } = rigStore(async () => ({
			message_id: "bcm_1",
			reactions: [r("🦄", 1, true)],
		}));
		await bridge.actions.toggleReaction(target, "🦄");
		expect(teamBridgeFrequentEmoji(SELF, 1_000)[0]).toBe("🦄");
		expect(teamBridgeFrequentEmoji("someone_else", 1_000)[0]).toBe(
			QUICK_EMOJI[0],
		);
	});

	it("a refusal restores the EXACT prior rows and marks the message failed", async () => {
		const { bridge, held, shown } = rigStore(async () => {
			throw new HubError({ kind: "server", message: "boom", status: 500 });
		});
		const before = held.reactions;
		expect(await bridge.actions.toggleReaction(target, THUMBS)).toBe("failed");
		expect(shown()).toBe(before);
		expect(bridge.store.getState().reactionFailed[reactionKey(target)]).toBe(
			true,
		);
		expect(bridge.store.getState().reactionsUnserved).toBe(false);
	});

	it("a failed add is not usage", async () => {
		const { bridge } = rigStore(async () => {
			throw new HubError({ kind: "server", message: "boom", status: 500 });
		});
		await bridge.actions.toggleReaction(target, "🦄");
		expect(teamBridgeFrequentEmoji(SELF, 1_000)[0]).toBe(QUICK_EMOJI[0]);
	});

	it("the next tap clears the error line and retries", async () => {
		let fail = true;
		const { bridge } = rigStore(async () => {
			if (fail) throw new HubError({ kind: "unreachable", message: "x" });
			return { message_id: "bcm_1", reactions: [r(THUMBS, 3, true)] };
		});
		await bridge.actions.toggleReaction(target, THUMBS);
		fail = false;
		expect(await bridge.actions.toggleReaction(target, THUMBS)).toBe("added");
		expect(bridge.store.getState().reactionFailed).toEqual({});
	});

	it("one toggle in flight per message: a double tap sends ONE request", async () => {
		const write = deferred<{ message_id: string; reactions: Reaction[] }>();
		const { bridge, hub, shown } = rigStore(() => write.promise);
		const first = bridge.actions.toggleReaction(target, THUMBS);
		expect(await bridge.actions.toggleReaction(target, THUMBS)).toBe("ignored");
		expect(await bridge.actions.toggleReaction(target, PARTY)).toBe("ignored");
		expect(hub.react).toHaveBeenCalledTimes(1);
		expect(shown()).toEqual([r(THUMBS, 3, true, ["Ada", "Ben"])]);
		write.resolve({ message_id: "bcm_1", reactions: [r(THUMBS, 3, true)] });
		await first;
	});

	it("a poll landing mid-write does not overwrite the optimistic rows; it shows after a refusal", async () => {
		const write = deferred<{ message_id: string; reactions: Reaction[] }>();
		const { bridge, held, shown } = rigStore(() => write.promise);
		const outcome = bridge.actions.toggleReaction(target, THUMBS);
		// The 20 s poll replaces the held message with a newer hub copy.
		const polled = { ...held, reactions: [r(THUMBS, 2), r("👀", 1)] };
		bridge.store.setState((s) => ({
			threads: {
				...s.threads,
				[threadKey(TENANT, CONV)]: {
					...(s.threads[threadKey(TENANT, CONV)] as ThreadData),
					messages: [polled],
				},
			},
		}));
		expect(shown()).toEqual([r(THUMBS, 3, true, ["Ada", "Ben"])]);
		write.reject(new HubError({ kind: "server", message: "x", status: 500 }));
		expect(await outcome).toBe("failed");
		// Applied after the write settled (spec step 5).
		expect(shown()).toEqual(polled.reactions);
	});

	it("patches every held copy: the timeline row and the reply thread's root", async () => {
		const { bridge, held, timelineRows } = rigStore(async () => ({
			message_id: "bcm_1",
			reactions: [r(PARTY, 1, true)],
		}));
		const rKey = replyThreadKey({
			tenantId: TENANT,
			conversationId: CONV,
			rootId: "bcm_1",
		});
		bridge.store.setState({
			replyThreads: {
				[rKey]: {
					root: held,
					replies: [message(2, SELF, "2026-11-19T09:01:00Z")],
					state: "ready",
					error: null,
					moreAfterSeq: null,
				},
			},
		});
		await bridge.actions.toggleReaction(target, PARTY);
		expect(timelineRows()).toEqual([r(PARTY, 1, true)]);
		expect(bridge.store.getState().replyThreads[rKey]?.root?.reactions).toEqual(
			[r(PARTY, 1, true)],
		);
	});

	it("reacts to a REPLY held only in its thread", async () => {
		const { bridge } = rigStore(async () => ({
			message_id: "bcm_2",
			reactions: [r(THUMBS, 1, true)],
		}));
		const rKey = replyThreadKey({
			tenantId: TENANT,
			conversationId: CONV,
			rootId: "bcm_1",
		});
		bridge.store.setState({
			replyThreads: {
				[rKey]: {
					root: null,
					replies: [message(2, SELF, "2026-11-19T09:01:00Z")],
					state: "ready",
					error: null,
					moreAfterSeq: null,
				},
			},
		});
		await bridge.actions.toggleReaction(
			{ ...target, messageId: "bcm_2" },
			THUMBS,
		);
		expect(
			bridge.store.getState().replyThreads[rKey]?.replies[0]?.reactions,
		).toEqual([r(THUMBS, 1, true)]);
	});

	it("an UNCODED 404 (old hub, no route) hides reactions for the session, no error", async () => {
		const { bridge, hub, held, shown } = rigStore(async () => {
			throw new HubError({ kind: "not_found", message: "x", status: 404 });
		});
		expect(await bridge.actions.toggleReaction(target, THUMBS)).toBe(
			"unserved",
		);
		const s = bridge.store.getState();
		expect(s.reactionsUnserved).toBe(true);
		expect(s.reactionFailed).toEqual({});
		expect(shown()).toBe(held.reactions);
		// Every later tap is refused locally: nothing more reaches the hub.
		expect(await bridge.actions.toggleReaction(target, PARTY)).toBe("unserved");
		expect(hub.react).toHaveBeenCalledTimes(1);
	});

	it("an uncoded 405 counts as unserved too; a CODED 404 is an ordinary failure", async () => {
		const a = rigStore(async () => {
			throw new HubError({ kind: "server", message: "x", status: 405 });
		});
		expect(await a.bridge.actions.toggleReaction(target, THUMBS)).toBe(
			"unserved",
		);
		const b = rigStore(async () => {
			throw new HubError({
				kind: "not_found",
				message: "x",
				status: 404,
				code: "message_not_found",
			});
		});
		expect(await b.bridge.actions.toggleReaction(target, THUMBS)).toBe(
			"failed",
		);
		expect(b.bridge.store.getState().reactionsUnserved).toBe(false);
	});

	it("a sign-out mid-write drops the answer: nothing of the old account is written", async () => {
		const write = deferred<{ message_id: string; reactions: Reaction[] }>();
		const { bridge } = rigStore(() => write.promise);
		const outcome = bridge.actions.toggleReaction(target, THUMBS);
		bridge.actions.reset();
		write.resolve({ message_id: "bcm_1", reactions: [r(THUMBS, 9, true)] });
		expect(await outcome).toBe("ignored");
		const s = bridge.store.getState();
		expect(s.reactionPending).toEqual({});
		expect(s.threads).toEqual({});
		expect(teamBridgeFrequentEmoji(SELF, 1_000)[0]).toBe(QUICK_EMOJI[0]);
	});
});

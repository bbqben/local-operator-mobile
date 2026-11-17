/**
 * Team Bridge under the hub's per-account rate limits (TestFlight 1157: the
 * drawer showed "Radient refused the request (HTTP 429)." and "The people
 * directory could not load." while the channel rows were still held).
 *
 * The hub keys `conversation-reads` and `reads` on the ACCOUNT, 120/min each,
 * and the phone shares both buckets with the desktop app and every agent on
 * that account. These tests pin the phone's half of the fix: it re-reads less
 * (freshness window, directory TTL), it waits out a 429 on the server's
 * `Retry-After` instead of re-asking on every drawer open, and a 429 never
 * becomes an error banner over rows it already holds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createHubClient,
	type HubClient,
	HubError,
} from "@/team-bridge/client";
import {
	CONVERSATIONS_FRESH_MS,
	createTeamBridgeStore,
	DIRECTORY_TTL_MS,
	RATE_LIMIT_FALLBACK_MS,
	RATE_LIMIT_MAX_MS,
	threadKey,
} from "@/team-bridge/store";
import {
	ADA,
	conversation,
	dm,
	message,
	person,
	SELF,
	TENANT,
} from "./fixtures";

const token = (sub: string) =>
	`h.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.s`;

const limited = (retryAfterMs: number | null = 7_000) =>
	new HubError({
		kind: "rate_limited",
		message: "Radient refused the request (HTTP 429).",
		status: 429,
		code: "rate_limited",
		retryAfterMs,
	});

function fakeHub(overrides: Partial<HubClient> = {}): HubClient {
	return {
		...createHubClient({
			accessToken: async () => token(SELF),
			fetchImpl: async () => {
				throw new Error("Unexpected transport");
			},
		}),
		listConversations: vi.fn(async () => ({
			conversations: [conversation(), dm(ADA, "Ada")],
			has_more: false,
		})),
		directory: vi.fn(async () => ({
			members: [person(ADA, "Ada")],
			unavailable_count: 0,
		})),
		listMessages: vi.fn(async () => ({
			messages: [message(3, ADA, "2026-10-21T10:00:00Z")],
			has_more: false,
		})),
		...overrides,
	};
}

let clock = 1_000_000;
const now = () => clock;
/** Advance the injected clock AND the fake timers together. */
async function advance(ms: number) {
	clock += ms;
	await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
	clock = 1_000_000;
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

function bridge(hub: HubClient) {
	return createTeamBridgeStore({
		hub: () => hub,
		accessToken: async () => token(SELF),
		now,
	});
}

describe("drawer re-opens reuse fresh reads", () => {
	it("a re-open inside the freshness window sends nothing", async () => {
		const hub = fakeHub();
		const { actions } = bridge(hub);
		await actions.loadOrganization(TENANT, { ifStale: true });
		await advance(CONVERSATIONS_FRESH_MS - 1);
		await actions.loadOrganization(TENANT, { ifStale: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(1);
		expect(hub.directory).toHaveBeenCalledTimes(1);
	});

	it("past the window only the conversations are re-read; the directory waits for its TTL", async () => {
		const hub = fakeHub();
		const { actions } = bridge(hub);
		await actions.loadOrganization(TENANT, { ifStale: true });
		await advance(CONVERSATIONS_FRESH_MS);
		await actions.loadOrganization(TENANT, { ifStale: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		expect(hub.directory).toHaveBeenCalledTimes(1);
		await advance(DIRECTORY_TTL_MS);
		await actions.loadOrganization(TENANT, { ifStale: true });
		expect(hub.directory).toHaveBeenCalledTimes(2);
	});

	it("an explicit retry (force) re-reads both halves at once", async () => {
		const hub = fakeHub();
		const { actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		await actions.loadOrganization(TENANT, { force: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		expect(hub.directory).toHaveBeenCalledTimes(2);
	});
});

describe("a 429 is waited out, never shown raw", () => {
	it("keeps held rows and people on screen with no error banner", async () => {
		let refuse = false;
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				if (refuse) throw limited();
				return {
					conversations: [conversation(), dm(ADA, "Ada")],
					has_more: false,
				};
			}),
			directory: vi.fn(async () => {
				if (refuse) throw limited();
				return { members: [person(ADA, "Ada")], unavailable_count: 0 };
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		refuse = true;
		await actions.loadOrganization(TENANT, { force: true });
		const org = store.getState().orgs[TENANT];
		expect(org?.conversationsState).toBe("ready");
		expect(org?.conversationsError).toBeNull();
		expect(org?.conversations).toHaveLength(2);
		expect(org?.peopleState).toBe("ready");
		expect(org?.peopleError).toBeNull();
		expect(org?.people).toHaveLength(1);
		// The first refusal is silent: no "Catching up…" yet.
		expect(org?.conversationsCatchingUp).toBe(false);
		expect(org?.peopleCatchingUp).toBe(false);
	});

	it("a cold 429 keeps the skeleton (loading), not an error", async () => {
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				throw limited();
			}),
			directory: vi.fn(async () => {
				throw limited();
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		const org = store.getState().orgs[TENANT];
		expect(org?.conversationsState).toBe("loading");
		expect(org?.conversationsError).toBeNull();
		expect(org?.peopleState).toBe("loading");
		expect(org?.peopleError).toBeNull();
	});

	it("re-opens during Retry-After send nothing; the scheduled retry recovers silently", async () => {
		let refuse = true;
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				if (refuse) throw limited(7_000);
				return { conversations: [conversation()], has_more: false };
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		expect(hub.listConversations).toHaveBeenCalledTimes(1);
		// Five drawer opens and a Retry tap inside the server's wait: no request.
		for (let i = 0; i < 5; i += 1) {
			await advance(1_000);
			await actions.loadOrganization(TENANT, { ifStale: true });
		}
		// A pull/Retry (force) still may not re-ask the refused half; it does
		// re-read the directory, whose bucket refused nothing.
		await actions.loadOrganization(TENANT, { force: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(1);
		expect(hub.directory).toHaveBeenCalledTimes(2);
		refuse = false;
		// The store's own retry fires once the wait has elapsed (t = 7 s).
		await advance(2_000);
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		const org = store.getState().orgs[TENANT];
		expect(org?.conversationsState).toBe("ready");
		expect(org?.conversations).toHaveLength(1);
		// The directory is inside its TTL: the scheduled retry does not re-read it.
		expect(hub.directory).toHaveBeenCalledTimes(2);
	});

	it("a refusal that persists past the backoff says Catching up, and backs off further", async () => {
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				throw limited(5_000);
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		expect(store.getState().orgs[TENANT]?.conversationsCatchingUp).toBe(false);
		await advance(5_000);
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		expect(store.getState().orgs[TENANT]?.conversationsCatchingUp).toBe(true);
		expect(store.getState().orgs[TENANT]?.conversationsError).toBeNull();
		// Second strike waits max(Retry-After, 2 × previous) = 10 s, not 5 s.
		await advance(9_999);
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		await advance(1);
		expect(hub.listConversations).toHaveBeenCalledTimes(3);
	});

	it("the wait never exceeds the ceiling, and a missing Retry-After uses the fallback", async () => {
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				throw limited(null);
			}),
		});
		const { actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		await advance(RATE_LIMIT_FALLBACK_MS - 1);
		expect(hub.listConversations).toHaveBeenCalledTimes(1);
		await advance(1);
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		// Walk the doubling until it pins at the ceiling.
		let calls = 2;
		for (let wait = RATE_LIMIT_FALLBACK_MS * 2; ; wait *= 2) {
			const step = Math.min(wait, RATE_LIMIT_MAX_MS);
			await advance(step);
			calls += 1;
			expect(hub.listConversations).toHaveBeenCalledTimes(calls);
			if (step === RATE_LIMIT_MAX_MS) break;
		}
		await advance(RATE_LIMIT_MAX_MS);
		expect(hub.listConversations).toHaveBeenCalledTimes(calls + 1);
	});

	it("success clears Catching up and the backoff", async () => {
		let refusals = 2;
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				if (refusals > 0) {
					refusals -= 1;
					throw limited(1_000);
				}
				return { conversations: [conversation()], has_more: false };
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		await advance(1_000);
		expect(store.getState().orgs[TENANT]?.conversationsCatchingUp).toBe(true);
		await advance(2_000);
		const org = store.getState().orgs[TENANT];
		expect(org?.conversationsCatchingUp).toBe(false);
		expect(org?.conversationsState).toBe("ready");
		// Backoff cleared: an explicit retry goes straight out.
		await actions.loadOrganization(TENANT, { force: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(4);
	});

	it("a refused pull over fresh rows leaves no strike behind for a later 429", async () => {
		let refuse = false;
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				if (refuse) throw limited(2_000);
				return { conversations: [conversation()], has_more: false };
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT, { ifStale: true });
		refuse = true;
		await actions.loadOrganization(TENANT, { force: true });
		// The retry finds the rows fresh and reads nothing.
		await advance(2_000);
		expect(hub.listConversations).toHaveBeenCalledTimes(2);
		// An hour later, a stale re-open is refused once: a FIRST strike, silent.
		await advance(60 * 60_000);
		await actions.loadOrganization(TENANT, { ifStale: true });
		expect(hub.listConversations).toHaveBeenCalledTimes(3);
		expect(store.getState().orgs[TENANT]?.conversationsCatchingUp).toBe(false);
	});

	it("non-429 failures keep their existing error state", async () => {
		const hub = fakeHub({
			directory: vi.fn(async () => {
				throw new HubError({ kind: "server", message: "x", status: 500 });
			}),
		});
		const { store, actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		expect(store.getState().orgs[TENANT]?.peopleState).toBe("error");
	});

	it("reset retires a scheduled retry", async () => {
		const hub = fakeHub({
			listConversations: vi.fn(async () => {
				throw limited(1_000);
			}),
		});
		const { actions } = bridge(hub);
		await actions.loadOrganization(TENANT);
		actions.reset();
		await advance(60_000);
		expect(hub.listConversations).toHaveBeenCalledTimes(1);
	});
});

describe("thread polls under a 429", () => {
	it("keep held messages, skip polls inside Retry-After, and show no error", async () => {
		let refuse = false;
		const hub = fakeHub({
			listMessages: vi.fn(async () => {
				if (refuse) throw limited(30_000);
				return {
					messages: [message(3, ADA, "2026-10-21T10:00:00Z")],
					has_more: false,
				};
			}),
		});
		const { store, actions } = bridge(hub);
		const key = threadKey(TENANT, "c1");
		await actions.loadThread(TENANT, "c1");
		refuse = true;
		await actions.loadThread(TENANT, "c1");
		expect(store.getState().threads[key]?.state).toBe("ready");
		expect(store.getState().threads[key]?.error).toBeNull();
		expect(store.getState().threads[key]?.messages).toHaveLength(1);
		// The screen's 20 s poll lands inside the 30 s wait: no request.
		await advance(20_000);
		await actions.loadThread(TENANT, "c1");
		expect(hub.listMessages).toHaveBeenCalledTimes(2);
		refuse = false;
		await advance(10_000);
		await actions.loadThread(TENANT, "c1");
		expect(hub.listMessages).toHaveBeenCalledTimes(3);
	});
});

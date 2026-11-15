/** Production endpoints/SSE/cache against the existing mock relay over loopback.
 * No native runtime or OS push-delivery claim: receipts below are injected. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { conversationPushFromResponse } from "@/notifications/payload";
import { RelayEndpoints, RelayHttpClient } from "@/relay";
import { loadFixture } from "@/testing/fixtures";
import { createRelay, DEFAULT_PASSWORD } from "../../../tools/mock-relay/relay";
import { createWarmCache, memoryWarmStore } from "../warm-cache";
import { createWarmSync } from "../warm-sync";
import { relayWarmSyncScope } from "../warm-sync-relay";

const rigs: ReturnType<typeof createRelay>[] = [];
afterEach(async () => {
	await Promise.all(rigs.splice(0).map((relay) => relay.shutdown()));
});

async function open() {
	const relay = createRelay({ quiet: true });
	rigs.push(relay);
	const { url } = await relay.listen({ port: 0 });
	const login = await fetch(`${url}/login`, {
		method: "POST",
		redirect: "manual",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: `password=${encodeURIComponent(DEFAULT_PASSWORD)}`,
	});
	let cookie = login.headers.getSetCookie()[0]?.split(";")[0] ?? "";
	const capture = loadFixture<{
		request: { path: string };
		body: { session_id: string };
	}>("http/push-conversation-ok.json");
	const sessionId = capture.body.session_id;
	const handle = capture.request.path.split("/").pop() ?? "";
	// The resolve capture and projection capture are separate original sessions.
	// Give the mock world that captured projection under the resolved test id.
	const existing = Object.values(relay.state.world.projections ?? {})[0];
	if (!existing) throw Error("mock world must contain a projection");
	relay.state.world.projections ??= {};
	relay.state.world.projections[sessionId] = {
		...existing,
		session_id: sessionId,
	};
	const observed: Array<{ path: string; status: number }> = [];
	const signals = new Map<string, AbortSignal | null | undefined>();
	const client = new RelayEndpoints(
		new RelayHttpClient({
			baseUrl: url,
			auth: () => ({ cookie, origin: null, credentials: "omit" }),
			fetchImpl: async (input, init) => {
				signals.set(new URL(String(input)).pathname, init?.signal);
				const response = await fetch(input, init);
				observed.push({
					path: new URL(String(input)).pathname,
					status: response.status,
				});
				return response;
			},
		}),
	);
	const cache = createWarmCache(memoryWarmStore());
	const scope = { accountId: "synthetic-account", routeKey: "synthetic-route" };
	const sync = createWarmSync();
	const retire = sync.register(
		relayWarmSyncScope({ client, cache, scope, isActive: () => true }),
	);
	return {
		relay,
		client,
		cache,
		scope,
		sync,
		retire,
		sessionId,
		handle,
		observed,
		signals,
		revokeCookie: () => {
			cookie = "";
		},
	};
}

describe("completion prefetch over the wire", () => {
	it("an injected receipt resolves on this relay, takes one seed, closes and saves the scoped cache", async () => {
		const h = await open();
		const stops = vi.fn();
		const save = h.cache.saveSession.bind(h.cache);
		vi.spyOn(h.cache, "saveSession").mockImplementation(async (...args) => {
			// Observe the REAL fetch signal before persistence, not merely a
			// stop() spy that could leave an externally-signalled body open.
			expect(
				h.signals.get(`/api/sessions/${h.sessionId}/events`)?.aborted,
			).toBe(true);
			return save(...args);
		});
		const original = h.client.sessionStream.bind(h.client);
		vi.spyOn(h.client, "sessionStream").mockImplementation((id, options) => {
			const stream = original(id, options);
			return {
				...stream,
				stop: () => {
					stops();
					stream.stop();
				},
			};
		});
		const push = conversationPushFromResponse({
			notification: {
				request: {
					content: {
						data: {
							body: {
								v: 1,
								type: "completion",
								computer: "opaque-computer",
								conversation: h.handle,
							},
						},
					},
				},
			},
		});
		expect(push).not.toBeNull();
		expect(await h.sync.received(push?.conversation ?? "")).toBe(true);
		expect(h.observed).toEqual([
			{ path: `/api/push/conversation/${h.handle}`, status: 200 },
			{ path: `/api/sessions/${h.sessionId}/events`, status: 200 },
		]);
		expect(stops).toHaveBeenCalledTimes(1);
		expect(
			(await h.cache.loadSession(h.scope, h.sessionId))?.projection.session_id,
		).toBe(h.sessionId);
		expect(
			await h.cache.loadSession(
				{ ...h.scope, accountId: "other-account" },
				h.sessionId,
			),
		).toBeNull();
		// Tap's resolved-id prefetch must not open another stream after receipt.
		expect(await h.sync.prefetch(h.sessionId)).toBe(false);
		expect(h.client.sessionStream).toHaveBeenCalledTimes(1);
		h.retire();
	});
	it("unknown/other-computer handles return 404 with no events request or cache write", async () => {
		const h = await open();
		expect(await h.sync.received("other-computers-handle")).toBe(false);
		expect(h.observed).toEqual([
			{ path: "/api/push/conversation/other-computers-handle", status: 404 },
		]);
		expect(await h.cache.loadSession(h.scope, h.sessionId)).toBeNull();
		h.retire();
	});
	it("a refused cookie yields 401 with no seed or cache write", async () => {
		const h = await open();
		h.revokeCookie();
		expect(await h.sync.received(h.handle)).toBe(false);
		expect(h.observed).toEqual([
			{ path: `/api/push/conversation/${h.handle}`, status: 401 },
		]);
		expect(await h.cache.loadSession(h.scope, h.sessionId)).toBeNull();
		h.retire();
	});
	it("an onscreen receipt may resolve but never opens a redundant stream", async () => {
		const h = await open();
		const close = h.sync.view(h.sessionId);
		expect(await h.sync.received(h.handle)).toBe(false);
		expect(h.observed).toEqual([
			{ path: `/api/push/conversation/${h.handle}`, status: 200 },
		]);
		close();
		h.retire();
	});
});

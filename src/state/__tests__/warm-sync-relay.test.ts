import { describe, expect, it, vi } from "vitest";
import { parsePayload } from "@/contracts";
import type { RelayEndpoints } from "@/relay/endpoints";
import type { DecodedFrame, SseConnectionOptions } from "@/relay/sse";
import { loadFixture } from "@/testing/fixtures";
import { createWarmCache, memoryWarmStore } from "../warm-cache";
import { createWarmSync } from "../warm-sync";
import { relayWarmSyncScope } from "../warm-sync-relay";

const projection = () =>
	parsePayload(
		"sessionProjection",
		loadFixture<{ data: unknown }>("sse/sse-projection-live-idle.json").data,
	);
const account = { accountId: "account-a", routeKey: "synthetic-route-a" };
function harness() {
	let handlers!: Omit<SseConnectionOptions, "open"> & { signal?: AbortSignal };
	let active = true;
	const stop = vi.fn();
	const start = vi.fn();
	const client = {
		resolveConversation: vi.fn(async () => ({ session_id: "session-a" })),
		sessionStream: vi.fn(
			(_id: string, options: Omit<SseConnectionOptions, "open">) => {
				handlers = options;
				return { stop, connection: { start } };
			},
		),
	} as unknown as RelayEndpoints;
	const cache = createWarmCache(memoryWarmStore());
	const adapter = relayWarmSyncScope({
		client,
		cache,
		scope: account,
		isActive: () => active,
	});
	return {
		client,
		cache,
		adapter,
		stop,
		start,
		transportAborted: () => handlers.signal?.aborted,
		frame: (frame: DecodedFrame) => handlers.onFrame?.(frame),
		retire: () => {
			active = false;
		},
	};
}

describe("relay seed take", () => {
	it("closes the stream before saving the first projection, ignores later frames", async () => {
		const h = harness();
		const save = vi.spyOn(h.cache, "saveSession");
		const pending = h.adapter.seed("session-a", new AbortController().signal);
		expect(h.start).toHaveBeenCalledTimes(1);
		h.frame({ kind: "projection", data: projection() });
		expect(h.stop).toHaveBeenCalledTimes(1);
		expect(h.transportAborted()).toBe(true);
		h.frame({ kind: "projection", data: projection() });
		expect(await pending).toBe(true);
		expect(save).toHaveBeenCalledTimes(1);
		expect(
			(await h.cache.loadSession(account, "session-a"))?.projection.version,
		).toBe(0);
	});
	it("timeout closes the stream and produces no cache write", async () => {
		const h = harness();
		const sync = createWarmSync();
		sync.register(h.adapter);
		expect(await sync.prefetch("session-a", 10)).toBe(false);
		expect(h.stop).toHaveBeenCalledTimes(1);
		expect(await h.cache.loadSession(account, "session-a")).toBeNull();
	});
	it("account switch before the first frame discards the write", async () => {
		const h = harness();
		const pending = h.adapter.seed("session-a", new AbortController().signal);
		h.retire();
		h.frame({ kind: "projection", data: projection() });
		expect(await pending).toBe(false);
		expect(await h.cache.loadSession(account, "session-a")).toBeNull();
	});
	it("account switch while a save is queued rejects that save at cache admission", async () => {
		const h = harness();
		const pending = h.adapter.seed("session-a", new AbortController().signal);
		h.frame({ kind: "projection", data: projection() });
		// saveSession serializes through a microtask. Retire before it can write.
		h.retire();
		expect(await pending).toBe(false);
		expect(await h.cache.loadSession(account, "session-a")).toBeNull();
	});
	it("aborted/retired scopes never open a stream", async () => {
		const h = harness();
		const controller = new AbortController();
		controller.abort();
		expect(await h.adapter.seed("session-a", controller.signal)).toBe(false);
		h.retire();
		expect(
			await h.adapter.seed("session-a", new AbortController().signal),
		).toBe(false);
		expect(h.client.sessionStream).not.toHaveBeenCalled();
	});
	it("relay handle resolution carries the caller's cancellation signal", async () => {
		const h = harness();
		const controller = new AbortController();
		expect(await h.adapter.resolve("opaque-handle", controller.signal)).toBe(
			"session-a",
		);
		expect(h.client.resolveConversation).toHaveBeenCalledWith("opaque-handle", {
			signal: controller.signal,
		});
	});
});

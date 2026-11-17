/** The config stream's resume wake (`config-stream.ts` `wake`), on a fake
 *  client: it reopens a silent or backed-off stream at once, leaves a recently
 *  live one alone, and never revives a terminal one. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type RelayEndpoints, RelayError } from "@/relay";
import { createConfigStore } from "@/state/config-store";
import { startConfigStream } from "./config-stream";

type Handlers = Parameters<RelayEndpoints["configStream"]>[0];

function fakeClient() {
	const opened: Handlers[] = [];
	const stops: number[] = [];
	const client = {
		configStream: (handlers: Handlers) => {
			opened.push(handlers);
			const index = opened.length - 1;
			return {
				connection: { start: () => undefined },
				stop: () => stops.push(index),
			};
		},
	} as unknown as RelayEndpoints;
	return { client, opened, stops };
}
const transient = { surface: "retry" } as unknown as RelayError;

describe("config stream wake", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("leaves a stream seen within 20 s alone, reopens one silent for longer", () => {
		const { client, opened, stops } = fakeClient();
		const handle = startConfigStream(client, createConfigStore());
		opened[0]?.onState?.({ state: "open", attempt: 1 });
		expect(handle.wake(Date.now() + 5_000)).toBe(false);
		expect(opened).toHaveLength(1);
		expect(handle.wake(Date.now() + 25_000)).toBe(true);
		expect(opened).toHaveLength(2);
		expect(stops).toEqual([0]);
		handle.stop();
	});

	it("cuts a pending restart short and does not double-open when it would have fired", () => {
		const { client, opened } = fakeClient();
		const handle = startConfigStream(client, createConfigStore(), {
			restartMs: 2_000,
		});
		opened[0]?.onState?.({ state: "open", attempt: 1 });
		opened[0]?.onError?.(transient);
		expect(handle.wake()).toBe(true);
		expect(opened).toHaveLength(2);
		vi.advanceTimersByTime(5_000);
		expect(opened).toHaveLength(2);
		handle.stop();
	});

	it("never revives a terminal stream (an older relay's 404)", () => {
		const { client, opened } = fakeClient();
		const handle = startConfigStream(client, createConfigStore());
		opened[0]?.onError?.(
			new RelayError("rejected", "Not Found", { status: 404 }),
		);
		expect(handle.wake(Date.now() + 60_000)).toBe(false);
		expect(opened).toHaveLength(1);
	});
});

describe("a woken reopen's baseline is a resync (PR #246 R3)", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());
	const frame = {
		kind: "config" as const,
		data: { changed_keys: [] as string[], language: "en" },
	};

	it("the first frame after a wake that reopened is marked resynced; later frames and a plain seed are not", () => {
		const { client, opened } = fakeClient();
		const store = createConfigStore();
		const handle = startConfigStream(client, store);
		// The route's own first seed: not a resync (nothing was missed).
		opened[0]?.onFrame?.(frame as never);
		expect(store.getState().resynced).toBe(false);
		// The phone was away; the wake replaced the dead stream.
		expect(handle.wake(Date.now() + 25_000)).toBe(true);
		opened[1]?.onFrame?.(frame as never);
		expect(store.getState().resynced).toBe(true);
		// The next frame on the same connection is an ordinary change frame.
		opened[1]?.onFrame?.(frame as never);
		expect(store.getState().resynced).toBe(false);
		handle.stop();
	});

	it("a wake that reopens nothing does not mark the next frame", () => {
		const { client, opened } = fakeClient();
		const store = createConfigStore();
		const handle = startConfigStream(client, store);
		opened[0]?.onState?.({ state: "open", attempt: 1 });
		expect(handle.wake(Date.now() + 1_000)).toBe(false);
		opened[0]?.onFrame?.(frame as never);
		expect(store.getState().resynced).toBe(false);
		handle.stop();
	});
});

/* Field report 2026-11-17 (TestFlight 1157): an older Mac answered a Radient
 * rate limit with `503 authorization_refused`, and every stream stopped for good
 * — nothing reopened until the operator acted 26 minutes later. */
describe("a gateway refusal on a recently healthy route", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	const legacyRefused = () =>
		new RelayError("gateway-refused", "copy", {
			status: 503,
			reason: "authorization_refused",
			reasonRaw: "authorization_refused",
			surface: "console",
			retry: "never",
		});

	it("reconnects by itself instead of stopping", () => {
		const { client, opened } = fakeClient();
		const handle = startConfigStream(client, createConfigStore(), {
			restartMs: 2_000,
		});
		opened[0]?.onState?.({ state: "open", attempt: 1 });
		opened[0]?.onError?.(legacyRefused());
		vi.advanceTimersByTime(20_000);
		expect(opened.length).toBeGreaterThan(1);
		handle.stop();
	});

	it("stops after 2 minutes of refusals, and a foreground re-arms it once", () => {
		const { client, opened } = fakeClient();
		const handle = startConfigStream(client, createConfigStore(), {
			restartMs: 2_000,
		});
		opened[0]?.onState?.({ state: "open", attempt: 1 });
		/* Refuse every reopen for 3 minutes. */
		for (let elapsed = 0; elapsed < 180_000; elapsed += 1_000) {
			const latest = opened.at(-1);
			if (latest !== undefined && !(latest as { refused?: true }).refused) {
				(latest as { refused?: true }).refused = true;
				latest.onError?.(legacyRefused());
			}
			vi.advanceTimersByTime(1_000);
		}
		const stoppedAt = opened.length;
		vi.advanceTimersByTime(600_000);
		expect(opened).toHaveLength(stoppedAt);
		/* The computer's answer can change without the phone changing: a return
		 * to the foreground asks once more. */
		expect(handle.wake(Date.now() + 60_000)).toBe(true);
		expect(opened).toHaveLength(stoppedAt + 1);
		handle.stop();
	});

	it("still stops at once on a route that never served", () => {
		const { client, opened } = fakeClient();
		const handle = startConfigStream(client, createConfigStore(), {
			restartMs: 2_000,
		});
		opened[0]?.onError?.(legacyRefused());
		vi.advanceTimersByTime(60_000);
		expect(opened).toHaveLength(1);
		handle.stop();
	});
});

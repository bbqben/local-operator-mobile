/**
 * The mock relay's LIVE language control, asserted on the wire.
 *
 * WHY THIS EXISTS. `/api/config/events` used to serve one baseline frame and
 * nothing else, so a rig could only capture a language it chose BEFORE the app
 * loaded. The mounted-switch evidence (a screen already rendered in French that
 * must re-render in Urdu without a reload) needs the relay to PUBLISH a change on
 * the stream the app already holds — exactly what the real daemon does when its
 * watcher drains a language change (`docs/relay/contract.md` §10).
 *
 * `POST /__mock/config {"language": "<supported locale>"}` is that control. The
 * contract this file pins:
 *   - strict: the body is exactly `{language: <string>}` naming a supported
 *     locale; anything else is a 400 that changes NOTHING (no silent `en`
 *     fallback the way `--language` typos are forgiven);
 *   - a change is published as `{changed_keys: ["language"], language}` on the
 *     SAME open response, through the existing stream pump;
 *   - writing the language already served publishes nothing;
 *   - it is a language control only: no world reset, no scenario change, no
 *     cookie rotation, no reconnect — and it honours the scenario pin's
 *     two-rigs-one-world refusal rather than bypassing it;
 *   - the app route keeps its normal auth.
 *
 * WHAT IS NOT HERE, AND WHY. That the change lands in the app's REAL client,
 * subscription and store is asserted in `src/e2e/config-stream.e2e.test.ts`,
 * not in this file. Everything under `tools/` is type-checked by
 * `tools/tsconfig.json` (`pnpm e2e:typecheck`), which has neither the app's `@/`
 * path alias nor its Expo ambient types; importing production modules from here
 * drags them into that program, where their `@/` imports do not resolve and
 * Expo's `ProcessEnv` augmentation (a required `NODE_ENV`) breaks unrelated
 * harness files. Tests that need production code live in the app's boundary.
 */

import { afterEach, describe, expect, it } from "vitest";

import { createRelay, DEFAULT_PASSWORD } from "./relay.ts";

interface ConfigFrame {
	changed_keys: string[];
	language: string;
}

interface MockState {
	scenario: string;
	language: string;
}

/** The pump ticks every 700 ms by default; two ticks and a margin is a window in
 *  which a duplicate WOULD have been written. Bounded, not a wait-for-luck. */
const NO_FRAME_WINDOW_MS = 1_600;
/** One pump tick plus scheduling slack: how long a published change may take. */
const FRAME_DEADLINE_MS = 2_500;

const rigs: ReturnType<typeof createRelay>[] = [];
const aborts: AbortController[] = [];

afterEach(async () => {
	for (const controller of aborts.splice(0)) controller.abort();
	await Promise.all(rigs.splice(0).map((relay) => relay.shutdown()));
});

async function start(language = "fr") {
	const relay = createRelay({ scenario: "idle", quiet: true, language });
	rigs.push(relay);
	const { url } = await relay.listen({ port: 0 });
	const login = await fetch(`${url}/login`, {
		method: "POST",
		redirect: "manual",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: `password=${encodeURIComponent(DEFAULT_PASSWORD)}`,
	});
	const cookie = login.headers.getSetCookie()[0]?.split(";")[0] ?? "";
	expect(cookie).not.toBe("");
	const control = (
		path: string,
		body?: unknown,
		headers: Record<string, string> = {},
	): Promise<Response> =>
		fetch(`${url}${path}`, {
			method: body === undefined ? "GET" : "POST",
			signal: AbortSignal.timeout(2_500),
			headers: { "content-type": "application/json", ...headers },
			body:
				body === undefined
					? undefined
					: typeof body === "string"
						? body
						: JSON.stringify(body),
		});
	const state = async (): Promise<MockState> =>
		(await (await control("/__mock/state")).json()) as MockState;
	return { relay, url, cookie, control, state };
}

/**
 * A raw SSE reader over ONE response: frames are queued as they cross the
 * socket, so "the second frame arrived on the same stream" is literal.
 */
async function openConfigStream(url: string, cookie: string) {
	const controller = new AbortController();
	aborts.push(controller);
	const response = await fetch(`${url}/api/config/events`, {
		headers: cookie === "" ? {} : { cookie },
		signal: controller.signal,
	});
	const frames: ConfigFrame[] = [];
	let waiters: Array<() => void> = [];
	let buffer = "";
	const pump = (async () => {
		if (!response.ok || !response.body) return;
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		try {
			for (;;) {
				const { value, done } = await reader.read();
				if (done) return;
				buffer += decoder.decode(value, { stream: true });
				let end = buffer.indexOf("\n\n");
				while (end !== -1) {
					const block = buffer.slice(0, end);
					buffer = buffer.slice(end + 2);
					const data = block
						.split("\n")
						.find((line) => line.startsWith("data: "));
					if (block.includes("event: config") && data) {
						frames.push(JSON.parse(data.slice(6)) as ConfigFrame);
						for (const wake of waiters.splice(0)) wake();
					}
					end = buffer.indexOf("\n\n");
				}
			}
		} catch {
			/* aborted by the test: the end of this reader, not a failure */
		}
	})();
	/** Resolves once `count` frames have arrived, or rejects at the deadline. */
	const waitForFrames = (count: number, deadlineMs = FRAME_DEADLINE_MS) =>
		new Promise<void>((resolve, reject) => {
			const check = () => {
				if (frames.length >= count) {
					clearTimeout(timer);
					resolve();
					return true;
				}
				return false;
			};
			const timer = setTimeout(() => {
				waiters = waiters.filter((w) => w !== wake);
				reject(
					new Error(
						`expected ${count} config frames within ${deadlineMs} ms, saw ${frames.length}`,
					),
				);
			}, deadlineMs);
			const wake = () => {
				if (!check()) waiters.push(wake);
			};
			if (!check()) waiters.push(wake);
		});
	const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
	return {
		response,
		frames,
		waitForFrames,
		settle,
		close: () => controller.abort(),
		done: pump,
	};
}

describe("POST /__mock/config publishes a live language change", () => {
	it("serves fr, switches to ur on the SAME stream, then back to fr", async () => {
		const rig = await start("fr");
		const before = await rig.state();
		const stream = await openConfigStream(rig.url, rig.cookie);
		expect(stream.response.status).toBe(200);
		await stream.waitForFrames(1);
		expect(stream.frames[0]).toEqual({ changed_keys: [], language: "fr" });

		const toUrdu = await rig.control("/__mock/config", { language: "ur" });
		expect(toUrdu.status).toBe(200);
		expect(await toUrdu.json()).toEqual({ language: "ur", changed: true });
		await stream.waitForFrames(2);
		expect(stream.frames[1]).toEqual({
			changed_keys: ["language"],
			language: "ur",
		});

		const toFrench = await rig.control("/__mock/config", { language: "fr" });
		expect(await toFrench.json()).toEqual({ language: "fr", changed: true });
		await stream.waitForFrames(3);
		expect(stream.frames[2]).toEqual({
			changed_keys: ["language"],
			language: "fr",
		});

		/* A language control, not a world control: the scenario is untouched. */
		const after = await rig.state();
		expect(after.scenario).toBe(before.scenario);
		expect(after.language).toBe("fr");
	});

	it("publishes nothing when the language written is the one served", async () => {
		const rig = await start("fr");
		const stream = await openConfigStream(rig.url, rig.cookie);
		await stream.waitForFrames(1);

		const same = await rig.control("/__mock/config", { language: "fr" });
		expect(same.status).toBe(200);
		expect(await same.json()).toEqual({ language: "fr", changed: false });
		await stream.settle(NO_FRAME_WINDOW_MS);
		expect(stream.frames).toHaveLength(1);
	});

	it("canonicalizes a supported tag's spelling (`zh_cn` → `zh-CN`)", async () => {
		const rig = await start("fr");
		const reply = await rig.control("/__mock/config", { language: "zh_cn" });
		expect(reply.status).toBe(200);
		expect(await reply.json()).toEqual({ language: "zh-CN", changed: true });
	});
});

describe("POST /__mock/config validates before it applies", () => {
	const rejected: Array<[string, unknown]> = [
		["a missing language", {}],
		["a non-string language", { language: 42 }],
		["a null language", { language: null }],
		["an extra key", { language: "ur", scenario: "loading" }],
		["an unsupported locale", { language: "de" }],
		["an unparseable tag (no silent en)", { language: "!!" }],
		["an empty tag", { language: "" }],
		["a JSON array", ["ur"]],
		["a JSON null", "null"],
		["a body that is not JSON", "language=ur"],
	];
	it.each(rejected)(
		"answers 400 for %s and changes nothing",
		async (_, body) => {
			const rig = await start("fr");
			const stream = await openConfigStream(rig.url, rig.cookie);
			await stream.waitForFrames(1);
			const before = await rig.state();

			const reply = await rig.control("/__mock/config", body);
			expect(reply.status).toBe(400);
			expect(((await reply.json()) as { error?: string }).error).toBeTruthy();

			expect(await rig.state()).toEqual(before);
			await stream.settle(NO_FRAME_WINDOW_MS);
			expect(stream.frames).toHaveLength(1);
		},
	);

	it("refuses a foreign Origin (a page on another site cannot drive it)", async () => {
		const rig = await start("fr");
		const reply = await rig.control(
			"/__mock/config",
			{ language: "ur" },
			{ origin: "https://evil.example" },
		);
		expect(reply.status).toBe(403);
		expect((await rig.state()).language).toBe("fr");
	});

	it("honours another rig's scenario pin instead of bypassing it", async () => {
		const rig = await start("fr");
		const pin = await rig.control(
			"/__mock/scenario",
			{ scenario: "idle" },
			{ "x-lo-harness": "rig-a" },
		);
		expect(pin.status).toBe(200);

		const intruder = await rig.control(
			"/__mock/config",
			{ language: "ur" },
			{ "x-lo-harness": "rig-b" },
		);
		expect(intruder.status).toBe(409);
		expect((await rig.state()).language).toBe("fr");

		const owner = await rig.control(
			"/__mock/config",
			{ language: "ur" },
			{ "x-lo-harness": "rig-a" },
		);
		expect(owner.status).toBe(200);
		expect((await rig.state()).language).toBe("ur");
	});
});

describe("the app route keeps its auth, and streams clean up", () => {
	it.each([
		["no cookie", ""],
		["a forged cookie", "lo_session=forged.value"],
	])("refuses the config stream with %s", async (_, cookie) => {
		const rig = await start("fr");
		const stream = await openConfigStream(rig.url, cookie);
		expect(stream.response.status).toBe(401);
		expect(stream.frames).toHaveLength(0);
	});

	it("a closed stream is not written to, and shutdown ends an open one", async () => {
		const rig = await start("fr");
		const gone = await openConfigStream(rig.url, rig.cookie);
		await gone.waitForFrames(1);
		gone.close();
		await gone.done;

		const live = await openConfigStream(rig.url, rig.cookie);
		await live.waitForFrames(1);
		const reply = await rig.control("/__mock/config", { language: "ur" });
		expect(reply.status).toBe(200);
		await live.waitForFrames(2);
		expect(gone.frames).toHaveLength(1);

		/* Shutdown with the stream still open must resolve, not hang on it. */
		await rigs.splice(0)[0]?.shutdown();
		await live.done;
	});
});

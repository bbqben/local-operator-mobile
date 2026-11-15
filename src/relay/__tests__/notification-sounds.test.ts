/** Real loopback HTTP, not a mocked endpoint: exercise cookie/Origin policy,
 * binary integrity and device-key reporting through the same RelayHttpClient
 * the selected tunnel uses. Native publishing/audibility is NOT proved here. */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	CustomSoundCache,
	customSoundStem,
	type SoundCacheDisk,
} from "../../notifications/custom-sound-cache";
import { RelayEndpoints } from "../endpoints";
import { RelayHttpClient } from "../http";

const bytes = readFileSync(
	new URL(
		"../../../assets/notification-sounds/soft_pulse.wav",
		import.meta.url,
	),
);
const sha = createHash("sha256").update(bytes).digest("hex");
let origin = "";
let reported: string[] = [];
let receivedCredential = false;
let large = false;
let deviceRefusalCode = "device_key_required";
let deviceRefusalEdge = false;
const server = createServer(async (req, res) => {
	if (
		req.headers.cookie !== "lop_mobile=synthetic-pair" ||
		req.headers.origin !== origin
	) {
		res.writeHead(401).end();
		return;
	}
	if (req.url === "/api/notification-sounds") {
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				selected: "custom:selected",
				enabled: true,
				sounds: [
					{
						id: "custom:selected",
						builtin: false,
						sha256: sha,
						push_name: `${customSoundStem(sha)}.wav`,
						size_bytes: bytes.length,
					},
				],
			}),
		);
	} else if (
		req.url === `/api/notification-sounds/custom%3Aselected/audio?sha=${sha}`
	) {
		res.setHeader("Content-Type", "audio/wav");
		res.write(large ? Buffer.alloc(2 * 1024 * 1024 + 1) : bytes);
		res.end();
	} else if (req.url === "/api/notification-sounds/cached") {
		if (
			req.headers["x-lop-device"] !== "synthetic-install" ||
			req.headers["x-lop-device-key"] !== "synthetic-key"
		) {
			res
				.writeHead(401, {
					"content-type": "application/json",
					...(deviceRefusalEdge
						? { "x-radient-login": "/_radient/login" }
						: {}),
				})
				.end(
					JSON.stringify({
						code: deviceRefusalCode,
						error: "Device key required",
					}),
				);
			return;
		}
		receivedCredential = true;
		let text = "";
		for await (const chunk of req) text += chunk;
		reported = JSON.parse(text).shas;
		res.end('{"ok":true}');
	} else {
		res.writeHead(404).end();
	}
});
beforeAll(async () => {
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string") throw Error("No listener");
	origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
});
const client = (
	cookie = "lop_mobile=synthetic-pair",
	onResponse?: (facts: { status: number }) => void,
) =>
	new RelayEndpoints(
		new RelayHttpClient({
			baseUrl: origin,
			onResponse,
			auth: () => ({ cookie, origin, credentials: "omit" }),
		}),
	);

describe("paired tunnel sound transport", () => {
	it("downloads and SHA-validates actual WAV bytes before readiness PUT", async () => {
		const relay = client();
		const rows: { sha: string; bytes: number; used: number; valid: boolean }[] =
			[];
		let claims: Record<string, string[]> = {};
		const disk: SoundCacheDisk = {
			async inventory() {
				return rows;
			},
			async touch() {},
			async remove() {},
			async commit(key, data, used) {
				expect(Buffer.from(data)).toEqual(bytes);
				rows.push({ sha: key, bytes: data.length, used, valid: true });
			},
			async claims() {
				return claims;
			},
			async claim(scope, shas) {
				claims = { ...claims, [scope]: shas };
			},
		};
		await new CustomSoundCache({
			scope: "synthetic-computer",
			disk,
			now: () => 1,
			digest: async (b) => createHash("sha256").update(b).digest("hex"),
			relay: {
				listing: () => relay.notificationSounds(),
				audio: (id, digest) => relay.notificationSoundAudio(id, digest),
				report: (stems) =>
					relay.noteNotificationSoundCache(
						"synthetic-install",
						"synthetic-key",
						stems,
					),
			},
		}).sync();
		expect(rows).toHaveLength(1);
		expect(reported).toEqual([customSoundStem(sha)]);
		expect(receivedCredential).toBe(true);
	});
	it("refuses missing paired cookie", async () => {
		await expect(client("").notificationSounds()).rejects.toMatchObject({
			status: 401,
		});
	});
	it("refuses an unregistered device key", async () => {
		await expect(
			client().noteNotificationSoundCache("synthetic-install", "wrong-key", []),
		).rejects.toMatchObject({ status: 401, code: "device_key_required" });
	});
	it.each([
		{ install: "synthetic-install", key: "wrong-key" },
		{ install: "other-computer-install", key: "synthetic-key" },
	])(
		"keeps a device-key refusal local while healthy reads remain authenticated ($install)",
		async ({ install, key }) => {
			const routeFailures: number[] = [];
			const relay = client(undefined, (facts) => {
				if (facts.status === 401) routeFailures.push(facts.status);
			});
			const before = [...reported];
			await expect(
				relay.noteNotificationSoundCache(install, key, []),
			).rejects.toMatchObject({ status: 401, code: "device_key_required" });
			expect(reported).toEqual(before);
			await expect(relay.notificationSounds()).resolves.toHaveProperty(
				"selected",
				"custom:selected",
			);
			expect(routeFailures).toEqual([]);
		},
	);
	it.each([
		{ code: "device_key_required", edge: true },
		{ code: "authentication_required", edge: false },
		{ code: "", edge: false },
	])(
		"does not suppress non-device or edge authentication: $code/$edge",
		async ({ code, edge }) => {
			deviceRefusalCode = code;
			deviceRefusalEdge = edge;
			const routeFailures: number[] = [];
			try {
				await expect(
					client(undefined, (facts) => {
						if (facts.status === 401) routeFailures.push(401);
					}).noteNotificationSoundCache(
						"other-computer-install",
						"wrong-key",
						[],
					),
				).rejects.toMatchObject({ status: 401 });
				expect(routeFailures).toEqual([401]);
			} finally {
				deviceRefusalCode = "device_key_required";
				deviceRefusalEdge = false;
			}
		},
	);
	it("does not exempt the same typed code without an explicit device-credential request", async () => {
		const failures: number[] = [];
		const http = new RelayHttpClient({
			baseUrl: origin,
			auth: () => ({
				cookie: "lop_mobile=synthetic-pair",
				origin,
				credentials: "omit",
			}),
			onResponse: (facts) => {
				failures.push(facts.status);
			},
		});
		await expect(
			http.raw({
				method: "PUT",
				path: "/api/notification-sounds/cached",
				body: { shas: [] },
			}),
		).rejects.toMatchObject({ status: 401, code: "device_key_required" });
		expect(failures).toEqual([401]);
	});
	it("still publishes a real cookie rejection to the route", async () => {
		const routeFailures: number[] = [];
		await expect(
			client("", (facts) => {
				routeFailures.push(facts.status);
			}).noteNotificationSoundCache("synthetic-install", "wrong-key", []),
		).rejects.toMatchObject({ status: 401 });
		expect(routeFailures).toEqual([401]);
	});
	it("refuses a stale digest", async () => {
		await expect(
			client().notificationSoundAudio("custom:selected", "0".repeat(64)),
		).rejects.toMatchObject({ status: 404 });
	});
	it("cancels oversized streamed audio even if Content-Length is absent", async () => {
		large = true;
		try {
			await expect(
				client().notificationSoundAudio("custom:selected", sha),
			).rejects.toThrow();
		} finally {
			large = false;
		}
	});
});

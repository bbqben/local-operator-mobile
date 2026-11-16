import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { RelayEndpoints } from "../endpoints";
import { RelayHttpClient } from "../http";

const closes: (() => Promise<void>)[] = [];
afterEach(async () => {
	for (const close of closes.splice(0)) await close();
});

/** A loopback relay, not a mesh substitute: checks the shipping auth-bearing
 * endpoint client against actual HTTP. Core owns per-chunk mesh authorization. */
async function relay() {
	const requests: {
		path: string;
		cookie?: string;
		owner?: string | string[];
	}[] = [];
	let refusal: { status: number; code: string } | null = null;
	let truncate = false;
	let hold = false;
	let started: (() => void) | undefined;
	const server = createServer((req, res) => {
		requests.push({
			path: req.url ?? "",
			cookie: req.headers.cookie,
			owner: req.headers["x-owner-device"],
		});
		if (req.headers.cookie !== "synthetic-phone=admitted") {
			res.writeHead(401).end();
			return;
		}
		if (refusal) {
			res.writeHead(refusal.status, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					error: refusal.code,
					code: refusal.code,
					remote: true,
				}),
			);
			return;
		}
		if (req.url?.endsWith("/document")) {
			res.writeHead(200, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					html: "<!doctype html><p>Generated owner document</p>",
				}),
			);
			return;
		}
		const sound = req.url?.includes("/sound?");
		const body = Buffer.from(sound ? "generated-sound" : "generated-file");
		res.writeHead(200, {
			"content-type": sound ? "audio/wav" : "text/plain",
			"content-length": body.length,
		});
		if (hold) {
			res.flushHeaders();
			started?.();
			return;
		}
		if (truncate) {
			res.write(body.subarray(0, 3));
			// Close after headers/partial bytes, as an owner-side mid-stream revoke
			// does. A complete HTTP response must never expose these partial bytes.
			res.flushHeaders();
			setImmediate(() => res.destroy());
			return;
		}
		res.end(body);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	closes.push(
		() =>
			new Promise<void>((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
	);
	const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	let authReads = 0;
	const client = new RelayEndpoints(
		new RelayHttpClient({
			baseUrl,
			auth: () => {
				authReads++;
				return {
					cookie: "synthetic-phone=admitted",
					origin: baseUrl,
					credentials: "omit",
				};
			},
		}),
	);
	return {
		client,
		requests,
		authReads: () => authReads,
		refuse: (status: number, code: string) => {
			refusal = { status, code };
		},
		truncate: () => {
			truncate = true;
		},
		hold: () => {
			hold = true;
			return new Promise<void>((resolve) => {
				started = resolve;
			});
		},
	};
}

describe("remote Highlights through the admitted relay", () => {
	it("fetches generated document/file/sound on exact existing URLs with auth and no peer host/path", async () => {
		const r = await relay();
		for (const id of ["synthetic-remote/owner", "synthetic-local"]) {
			expect(
				(await r.client.supplementDocument(id, "digest/one")).html,
			).toContain("Generated owner document");
			expect(
				new TextDecoder().decode(
					(await r.client.supplementFile(id, "job/one", 2)).bytes,
				),
			).toBe("generated-file");
			expect(
				new TextDecoder().decode(
					(await r.client.supplementSound(id, "digest/one")).bytes,
				),
			).toBe("generated-sound");
			const prefix = `/api/sessions/${encodeURIComponent(id)}`;
			expect(r.requests.slice(-3).map((request) => request.path)).toEqual([
				`${prefix}/supplements/digest%2Fone/document`,
				`${prefix}/supplements/job%2Fone/file?i=2`,
				`${prefix}/sound?digest=digest%2Fone`,
			]);
		}
		expect(r.authReads()).toBe(6);
		expect(
			r.requests.every(
				(req) =>
					req.cookie === "synthetic-phone=admitted" &&
					req.owner === undefined &&
					!req.path.includes("path="),
			),
		).toBe(true);
	});
	it.each([
		[503, "remote_unreachable"],
		[403, "remote_forbidden"],
		[409, "remote_unsupported"],
		[409, "remote_supplement_needs_running"],
		[409, "remote_media_changed"],
	] as const)(
		"keeps %s %s operation-local without replay or logout",
		async (status, code) => {
			const r = await relay();
			r.refuse(status, code);
			for (const read of [
				() => r.client.supplementDocument("remote", "digest"),
				() => r.client.supplementFile("remote", "job", 0),
				() => r.client.supplementSound("remote", "digest"),
			]) {
				await expect(read()).rejects.toMatchObject({
					status,
					code,
					kind: "rejected",
					surface: "none",
					retry: "never",
				});
			}
			expect(r.requests).toHaveLength(3);
		},
	);
	it("discards a sound truncated mid-body and never retries/concatenates it", async () => {
		const r = await relay();
		r.truncate();
		await expect(
			r.client.supplementSound("remote", "digest"),
		).rejects.toMatchObject({ kind: "transport" });
		expect(r.requests).toHaveLength(1);
	});
	it("cancels a pending sound body through the same authenticated fetch pipeline", async () => {
		const r = await relay();
		const started = r.hold();
		const controller = new AbortController();
		const result = r.client.supplementSound(
			"remote",
			"digest",
			controller.signal,
		);
		const rejected = expect(result).rejects.toMatchObject({
			kind: "transport",
		});
		await started;
		controller.abort();
		await rejected;
		expect(r.requests).toHaveLength(1);
	});
});

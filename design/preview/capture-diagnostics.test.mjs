import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createDiagnostics, rendererFacts, retainSafely } from "./capture-diagnostics.mjs";

const fixture = (run) => {
	const directory = mkdtempSync(join(process.env.LOCAL_OPERATOR_SCRATCHPAD ?? tmpdir(), "listing-diagnostics-test-"));
	try {
		const fresh = join(directory, "synthetic.png");
		// Valid 1x1 synthetic PNG: no browser, native runtime or decoder required.
		writeFileSync(fresh, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));
		run(directory, fresh);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};
const metrics = { strict: 19, beyondFuzz: 19, largest: 19, fuzz: 1, stale: true };

test("both invocations and every surface retain distinct actuals; only stale frames get deltas", () => fixture((directory, fresh) => {
	let differences = 0;
	for (const invocation of ["all", "frames"]) {
		const retain = createDiagnostics({ directory, invocation, renderer: rendererFacts(), fonts: {},
			makeDifference: (_a, _b, output) => { differences++; writeFileSync(output, "synthetic delta"); } });
		for (const surface of ["appstore-iphone-6.9", "appstore-ipad-13", "play-phone"]) {
			retain({ surface, slug: "01-session-transcript", fresh, reference: fresh,
				metrics: { ...metrics, stale: surface !== "appstore-iphone-6.9" } });
			const files = readdirSync(join(directory, `${invocation}-${process.pid}`, surface, "01-session-transcript"));
			assert.ok(files.includes("actual.png"));
			assert.equal(files.includes("delta.png"), surface !== "appstore-iphone-6.9");
		}
	}
	assert.equal(differences, 4);
}));

test("artifact allowlists reject private paths and omit secret-bearing metadata fields", () => fixture((directory, fresh) => {
	const secret = "DO_NOT_UPLOAD_SYNTHETIC_SECRET";
	const renderer = rendererFacts({ product: "Chrome/test", commandLine: secret }, {
		gpu: { devices: [{ deviceString: "synthetic GPU", privateField: secret }], auxAttributes: { glRenderer: "synthetic backend", privateField: secret } }, privateField: secret,
	});
	const retain = createDiagnostics({ directory, invocation: "frames", renderer, fonts: {}, makeDifference: () => {} });
	assert.throws(() => retain({ surface: "../../HOME", slug: "01-session-transcript" }), /whitelist/);
	assert.throws(() => retain({ surface: "play-phone", slug: "09-sign-in" }), /whitelist/);
	retain({ surface: "play-phone", slug: "01-session-transcript", fresh, reference: fresh,
		metrics: { ...metrics, stale: false, privateField: secret }, faces: [
			{ family: "Figtree", status: "loaded", weight: "300 900", url: secret }, { family: secret },
		] });
	const run = join(directory, `frames-${process.pid}`);
	const metadata = readFileSync(join(run, "renderer.json"), "utf8") + readFileSync(join(run, "play-phone/01-session-transcript/comparison.json"), "utf8");
	assert.ok(!metadata.includes(secret));
	assert.ok(!metadata.includes(process.env.HOME));
	assert.match(metadata, /synthetic backend/);
}));

test("diagnostic failure leaves both passing and failing exit statuses untouched, with no secret output", () => {
	const previous = process.exitCode;
	try {
		for (const status of [0, 1]) {
			process.exitCode = status;
			const warnings = [];
			retainSafely(() => { throw new Error("SYNTHETIC_SECRET"); }, {}, (text) => warnings.push(text));
			assert.equal(process.exitCode, status);
			assert.deepEqual(warnings, ["listing diagnostics: evidence incomplete (gate verdict unchanged)"]);
		}
	} finally {
		process.exitCode = previous;
	}
});

test("failure evidence survives child exit without changing the failing exit status", () => fixture((directory, fresh) => {
	const module = new URL("./capture-diagnostics.mjs", import.meta.url).href;
	const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
		import { createDiagnostics } from ${JSON.stringify(module)};
		import { copyFileSync } from 'node:fs';
		process.exitCode = 1;
		const retain = createDiagnostics({ directory: ${JSON.stringify(directory)}, invocation: 'frames', renderer: {}, fonts: {}, makeDifference: (a,b,out) => copyFileSync(a,out) });
		retain({ surface: 'appstore-ipad-13', slug: '01-session-transcript', fresh: ${JSON.stringify(fresh)}, reference: ${JSON.stringify(fresh)}, metrics: ${JSON.stringify(metrics)} });
	`], { encoding: "utf8", timeout: 5000 });
	assert.equal(child.status, 1, child.stderr);
	const path = join(directory, `frames-${child.pid}`, "appstore-ipad-13/01-session-transcript");
	assert.deepEqual(readFileSync(join(path, "actual.png")), readFileSync(fresh));
	assert.equal(JSON.parse(readFileSync(join(path, "comparison.json"))).stale, true);
	assert.ok(readdirSync(path).includes("delta.png"));
}));

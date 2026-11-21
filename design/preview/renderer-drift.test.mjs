// node:test only — the design-kit job installs no node dependencies, so these
// run there with plain `node --test` next to capture-diagnostics.test.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { rendererLine, rendererVersion } from "./capture-diagnostics.mjs";
import { recordedRenderers, rendererDrift } from "./renderer-drift.mjs";

const script = new URL("./renderer-drift.mjs", import.meta.url).pathname;

const withDiagnostics = (passes, run) => {
	const directory = mkdtempSync(join(process.env.LOCAL_OPERATOR_SCRATCHPAD ?? tmpdir(), "renderer-drift-test-"));
	try {
		for (const [name, renderer] of Object.entries(passes)) {
			mkdirSync(join(directory, name));
			if (renderer !== undefined) writeFileSync(join(directory, name, "renderer.json"), JSON.stringify({ renderer }));
		}
		return run(directory);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};

test("the version reads the same from CDP's product and the binary's --version", () => {
	assert.equal(rendererVersion("HeadlessChrome/157.0.8103.80"), "157.0.8103.80");
	assert.equal(rendererVersion("Google Chrome 157.0.8103.80 \n"), "157.0.8103.80");
	assert.equal(rendererVersion(undefined), null);
	assert.equal(rendererVersion("Chrome"), null);
});

test("every --check prints one renderer line, and an unreadable answer says unavailable", () => {
	assert.equal(
		rendererLine({ product: "HeadlessChrome/157.0.8103.80", graphics: { skiaBackendType: "GraphiteDawnMetal" } }),
		"renderer: HeadlessChrome/157.0.8103.80 skiaBackendType=GraphiteDawnMetal",
	);
	assert.equal(rendererLine({ product: "HeadlessChrome/157.0.8103.80", graphics: {} }), "renderer: HeadlessChrome/157.0.8103.80 skiaBackendType=unknown");
	for (const facts of [null, undefined, { unavailable: true }, {}, { product: null }]) {
		assert.equal(rendererLine(facts), "renderer: unavailable");
	}
});

// The incident shape: the two passes of one job on different builds (run evidence
// in the PR body: 156.0.8078.80 then 157.0.8103.80).
test("FAILS when a pass rendered with a build other than the frozen one, naming every version", () => withDiagnostics({
	"all-101": { product: "HeadlessChrome/156.0.8078.80" },
	"frames-202": { product: "HeadlessChrome/157.0.8103.80" },
}, (directory) => {
	const verdict = rendererDrift({ frozen: "Google Chrome 156.0.8078.80", records: recordedRenderers(directory) });
	assert.equal(verdict.ok, false);
	assert.match(verdict.message, /the capture renderer changed mid-job; the gate's verdict would be meaningless/);
	for (const version of ["156.0.8078.80", "157.0.8103.80"]) assert.ok(verdict.message.includes(version));
}));

test("FAILS when both passes agree with each other but not with the frozen copy", () => {
	const records = [{ pass: "all", run: "all-1", version: "158.0.8127.36" }, { pass: "frames", run: "frames-2", version: "158.0.8127.36" }];
	assert.equal(rendererDrift({ frozen: "Google Chrome 157.0.8103.79", records }).ok, false);
});

test("FAILS closed when the frozen version itself is unreadable", () => {
	for (const frozen of [undefined, "", "Google Chrome"]) {
		const verdict = rendererDrift({ frozen, records: [] });
		assert.equal(verdict.ok, false);
		assert.match(verdict.message, /unreadable/);
	}
});

test("passes when every recorded pass matches the frozen build", () => withDiagnostics({
	"all-101": { product: "HeadlessChrome/157.0.8103.80" },
	"frames-202": { product: "HeadlessChrome/157.0.8103.80" },
}, (directory) => {
	const verdict = rendererDrift({ frozen: "Google Chrome 157.0.8103.80", records: recordedRenderers(directory) });
	assert.equal(verdict.ok, true);
	assert.equal(verdict.warning, null);
}));

test("a pass with no recorded renderer warns but never fails on its own", () => withDiagnostics({
	"all-101": { unavailable: true },
	"frames-202": undefined,
	"unrelated": { product: "HeadlessChrome/1.2.3.4" },
}, (directory) => {
	const records = recordedRenderers(directory);
	assert.deepEqual(records.map((r) => r.run), ["all-101", "frames-202"]);
	const verdict = rendererDrift({ frozen: "Google Chrome 157.0.8103.80", records });
	assert.equal(verdict.ok, true);
	assert.match(verdict.warning, /all and frames pass/);
}));

test("the CLI exits 1 with an ::error:: on drift and 0 when the renderer held", () => {
	for (const [frames, status] of [["157.0.8103.80", 0], ["158.0.8127.36", 1]]) {
		withDiagnostics({
			"all-1": { product: "HeadlessChrome/157.0.8103.80" },
			"frames-2": { product: `HeadlessChrome/${frames}` },
		}, (directory) => {
			const child = spawnSync(process.execPath, [script, directory, "Google Chrome 157.0.8103.80"], { encoding: "utf8", timeout: 5000 });
			assert.equal(child.status, status, child.stdout + child.stderr);
			if (status) assert.match(child.stdout, /^::error::the capture renderer changed mid-job/m);
		});
	}
});

test("the design-kit job freezes Chrome before any use and checks drift after the listing gate", () => {
	const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
	const design = workflow.slice(workflow.indexOf("  design-kit:"), workflow.indexOf("  ci-gate:"));
	const at = (name) => design.indexOf(`      - name: ${name}\n`);
	const freeze = at("Freeze the capture renderer for the whole job");
	assert.ok(freeze >= 0);
	// Nothing before the freeze may touch Chrome, and nothing after it may name the
	// mutable /Applications bundle as the binary to run.
	assert.doesNotMatch(design.slice(0, freeze), /Google Chrome/);
	assert.doesNotMatch(design.slice(freeze).split("\n      - name:").slice(1).join(""), /\/Applications\/Google/);
	assert.ok(design.slice(freeze).includes('echo "CHROME=$frozen/Contents/MacOS/Google Chrome" >> "$GITHUB_ENV"'));
	const drift = at("The capture renderer did not change mid-job");
	assert.ok(drift > at("The committed listing frames re-render identically"));
	assert.match(design.slice(drift), /node design\/preview\/renderer-drift\.mjs "\$RUNNER_TEMP\/listing-render-diagnostics" "\$CAPTURE_CHROME_VERSION"/);
});

/**
 * Fails the design-kit job when its capture renderer changed mid-job.
 *
 * WHY. "The committed listing frames re-render identically" failed in 13 of 78
 * recent design-kit runs, on `main` and on unrelated pull requests alike, always
 * with one signature (9 of 26 verified; iPad +19 px and phone +9 px beyond the 1%
 * fuzz, max channel difference 19/255, on the stroke edge of the caption's inline
 * SVG mark). The listing diagnostics showed why: GoogleUpdater replaces
 * /Applications/Google Chrome.app while the job runs, so the `all` pass and the
 * `frames` pass rendered with DIFFERENT Chrome builds in 11 of 12 runs (e.g.
 * 156.0.8078.80, then 157.0.8103.80). A pixel gate whose renderer is swapped
 * between passes is not measuring the frames.
 *
 * The job now snapshots the bundle at start and points `CHROME` at the copy, so
 * every pass launches the same immutable binary. This script is the proof that
 * held: it compares the version the snapshot step recorded with the renderer
 * each `capture.mjs --check` pass wrote into its diagnostics `renderer.json`, and
 * fails, naming every version, if they disagree.
 *
 * WHAT IT DOES NOT DO. A pass with no recorded renderer (CDP did not answer in
 * time) is a warning, not a failure: renderer facts are observational and must
 * never become a new source of red on their own (capture.mjs prints
 * "renderer: unavailable" in that case). The frozen copy is the guarantee; this
 * is the check that the guarantee was in force wherever it can be read.
 *
 * Run: `node design/preview/renderer-drift.mjs <diagnostics-dir> "<frozen --version output>"`.
 * Exit 0 when consistent, 1 on drift or an unreadable frozen version.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { rendererVersion } from "./capture-diagnostics.mjs";

const PASSES = ["all", "frames"];

/** Every pass's recorded version, from the `<invocation>-<pid>/renderer.json`
 * files `createDiagnostics` writes. Unreadable files count as no record. */
export const recordedRenderers = (directory) => {
	if (!existsSync(directory)) return [];
	return readdirSync(directory)
		.filter((name) => /^(all|frames)-\d+$/.test(name))
		.sort()
		.map((name) => {
			let version = null;
			try {
				version = rendererVersion(JSON.parse(readFileSync(join(directory, name, "renderer.json"), "utf8")).renderer?.product);
			} catch {
				/* no record: reported as missing below */
			}
			return { pass: name.split("-")[0], run: name, version };
		});
};

/** The verdict as a value so it can be tested without a runner. */
export const rendererDrift = ({ frozen, records }) => {
	const frozenVersion = rendererVersion(frozen);
	if (!frozenVersion) {
		return { ok: false, message: `the frozen capture renderer's version is unreadable (${JSON.stringify(frozen ?? "")}); cannot prove the job used one renderer` };
	}
	const seen = records.filter((r) => r.version);
	const drifted = seen.filter((r) => r.version !== frozenVersion);
	const missing = PASSES.filter((pass) => !seen.some((r) => r.pass === pass));
	const summary = [`frozen ${frozenVersion}`, ...records.map((r) => `${r.run} ${r.version ?? "unavailable"}`)].join(", ");
	if (drifted.length) {
		return { ok: false, message: `the capture renderer changed mid-job; the gate's verdict would be meaningless (${summary})` };
	}
	return {
		ok: true,
		message: `capture renderer held for the whole job (${summary})`,
		warning: missing.length ? `no renderer recorded for the ${missing.join(" and ")} pass(es); drift there cannot be ruled out from the log (the frozen CHROME copy still applied)` : null,
	};
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [directory, frozen] = process.argv.slice(2);
	if (!directory) {
		console.error('usage: node design/preview/renderer-drift.mjs <diagnostics-dir> "<frozen --version output>"');
		process.exit(1);
	}
	const verdict = rendererDrift({ frozen, records: recordedRenderers(directory) });
	if (verdict.warning) console.log(`::warning::${verdict.warning}`);
	console.log(verdict.ok ? verdict.message : `::error::${verdict.message}`);
	process.exit(verdict.ok ? 0 : 1);
}

/**
 * The `release-staging` job's artefact-visibility wait, pinned.
 *
 * WHY. That job uploads probe artefacts and downloads them in the same job, and
 * the artefact backend's listing is eventually consistent right after an upload:
 * #348, #349 and #350 each went red with the artefact "not found" ~1 s after
 * finalize and passed on a rerun. The fix is a bounded wait between the uploads
 * and the downloads (see the step's own comment in ci.yml). A later tidy-up that
 * deletes it, moves it after a download, lets it run unbounded or soft-fails it
 * brings the flake back — or worse, hides a real round-trip failure — and no
 * test elsewhere would notice, because the race cannot be reproduced on demand.
 *
 * WHAT IT CHECKS, statically: the wait sits after every upload and before the
 * first download; it polls this run's artefact listing for every uploaded name;
 * it is bounded (step timeout and in-script deadline) and fails with `exit 1`;
 * nothing in the job uses `continue-on-error`; the job grants `actions: read`
 * and writes nothing; and the download steps keep release.yml's `name` + `path`
 * shape (the job exists to mirror release.yml). Each property has a negative
 * control below proving the check can fail.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CI = readFileSync(
	fileURLToPath(new URL("../../.github/workflows/ci.yml", import.meta.url)),
	"utf8",
);

const WAIT_NAME = "Wait until both probe artefacts are listed for this run";

/** The `release-staging:` job block, up to the next top-level job key. */
function jobBlock(text: string): string {
	const lines = text.split("\n");
	const start = lines.indexOf("  release-staging:");
	if (start < 0) throw new Error("release-staging job not found");
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[i])) {
			end = i;
			break;
		}
	}
	return lines.slice(start, end).join("\n");
}

/** Steps as text chunks, split on `      - ` (the job's step indentation). */
function steps(job: string): string[] {
	return job.split(/\n(?= {6}- )/).slice(1);
}

function problems(text: string): string[] {
	const out: string[] = [];
	const job = jobBlock(text);
	const all = steps(job);
	// Anchored to the step's own `uses:` key (`- uses:` or an 8-space key under
	// `- name:`): the "Assert the release still uses…" step greps for the upload
	// action's text inside its script, which must not count as an upload.
	const isUpload = (s: string) =>
		/^(?: {6}- | {8})uses: (?:\.\/\.github\/actions\/upload-android-release|actions\/upload-artifact@)/m.test(
			s,
		);
	const isDownload = (s: string) =>
		/^(?: {6}- | {8})uses: actions\/download-artifact@/m.test(s);
	const waitIdx = all.findIndex((s) => s.includes(`name: ${WAIT_NAME}`));
	const lastUpload = all.map(isUpload).lastIndexOf(true);
	const firstDownload = all.findIndex(isDownload);
	if (waitIdx < 0) return ["visibility wait step missing"];
	if (lastUpload < 0 || firstDownload < 0)
		out.push("upload/download steps missing");
	if (!(waitIdx > lastUpload && waitIdx < firstDownload))
		out.push("wait is not between the last upload and the first download");

	const wait = all[waitIdx];
	if (!wait.includes("actions/runs/$RUN_ID/artifacts"))
		out.push("wait does not poll this run's artefact listing");
	const uploaded = all
		.filter(isUpload)
		.map((s) => /\n\s+name: (\S+)/.exec(s.slice(s.indexOf("with:")))?.[1]);
	const expected = /EXPECTED: (.+)/.exec(wait)?.[1].trim().split(/\s+/) ?? [];
	for (const name of uploaded)
		if (!name || !expected.includes(name))
			out.push(`wait does not expect uploaded artefact ${name}`);
	const stepTimeout = Number(/timeout-minutes: (\d+)/.exec(wait)?.[1]);
	if (!(stepTimeout > 0 && stepTimeout <= 5))
		out.push("wait step timeout missing or > 5 min");
	const deadline = Number(
		/deadline=\$\(\(SECONDS \+ (\d+)\)\)/.exec(wait)?.[1],
	);
	if (!(deadline > 0 && deadline <= 120))
		out.push("in-script deadline missing or > 120 s");
	if (!/exit 1/.test(wait))
		out.push("wait does not fail when the deadline passes");
	if (/continue-on-error/.test(job)) out.push("job uses continue-on-error");

	const perms = /\n {4}permissions:\n((?: {6}.+\n)+)/.exec(job)?.[1] ?? "";
	if (!/actions: read/.test(perms)) out.push("job lacks actions: read");
	if (/write/.test(perms)) out.push("job grants a write permission");

	for (const d of all.filter(isDownload)) {
		const keys = [
			...d.slice(d.indexOf("with:")).matchAll(/\n {10}([a-z-]+):/g),
		].map((m) => m[1]);
		if (keys.join(",") !== "name,path")
			out.push(
				`download step drifted from release.yml's name+path shape: ${keys}`,
			);
	}
	return out;
}

describe("release-staging artefact visibility wait", () => {
	it("holds every property on the committed ci.yml", () => {
		expect(problems(CI)).toEqual([]);
	});

	const job = jobBlock(CI);
	const waitStep =
		steps(job).find((s) => s.includes(`name: ${WAIT_NAME}`)) ?? "";
	const mutate = (from: string, to: string) => {
		expect(CI.includes(from)).toBe(true);
		return problems(CI.replace(from, to));
	};

	it("fails when the wait is removed", () => {
		expect(mutate(`${waitStep}\n`, "")).toContain(
			"visibility wait step missing",
		);
	});

	it("fails when the wait moves after a download", () => {
		const dl =
			"      - uses: actions/download-artifact@v8\n        with:\n          name: ios-ipa-probe\n          path: artifacts\n";
		const moved = CI.replace(`${waitStep}\n`, "").replace(
			dl,
			`${dl}${waitStep}\n`,
		);
		expect(problems(moved)).toContain(
			"wait is not between the last upload and the first download",
		);
	});

	it("fails when an uploaded artefact is not awaited", () => {
		expect(
			mutate(
				"EXPECTED: android-release-probe ios-ipa-probe",
				"EXPECTED: android-release-probe",
			),
		).toContain("wait does not expect uploaded artefact ios-ipa-probe");
	});

	it("fails when the wait is unbounded or soft", () => {
		expect(
			mutate("deadline=$((SECONDS + 60))", "deadline=$((SECONDS + 3600))"),
		).toContain("in-script deadline missing or > 120 s");
		expect(mutate("        timeout-minutes: 2\n", "")).toContain(
			"wait step timeout missing or > 5 min",
		);
		expect(
			mutate(
				`        timeout-minutes: 2\n`,
				"        timeout-minutes: 2\n        continue-on-error: true\n",
			),
		).toContain("job uses continue-on-error");
	});

	it("fails when permissions are dropped or widened", () => {
		expect(mutate("      actions: read\n", "")).toContain(
			"job lacks actions: read",
		);
		expect(
			mutate(
				"      contents: read\n      actions: read\n",
				"      contents: write\n      actions: read\n",
			),
		).toContain("job grants a write permission");
	});

	it("fails when a download diverges from release.yml's shape", () => {
		expect(
			mutate(
				"          name: ios-ipa-probe\n          path: artifacts\n",
				"          name: ios-ipa-probe\n          path: artifacts\n          run-id: 1\n",
			),
		).toContain(
			"download step drifted from release.yml's name+path shape: name,path,run-id",
		);
	});
});

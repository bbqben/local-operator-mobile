import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { KEYED_SITES, keyedSiteViolations } from "./keyed-sites.ts";

/**
 * The exact-file guard on the real tree, plus negative controls proving it can
 * fail: a guard that never fires would let a keyed screen regress to English
 * while CI stays green (the scanner's own blind spots are why it exists).
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (file: string): string => readFileSync(`${ROOT}${file}`, "utf8");

describe("keyed sites stay keyed (O3-a)", () => {
	it.each(KEYED_SITES)("$file carries none of its retired literals", (site) => {
		expect(keyedSiteViolations(site, read(site.file))).toEqual([]);
	});

	it("lists each file once", () => {
		const files = KEYED_SITES.map((site) => site.file);
		expect(new Set(files).size).toBe(files.length);
	});
});

describe("the guard fails when a site regresses (negative controls)", () => {
	const site = (file: string) => {
		const found = KEYED_SITES.find((entry) => entry.file === file);
		if (found === undefined) throw new Error(`no keyed site ${file}`);
		return found;
	};

	it("flags a retired literal put back into the real source", () => {
		const entry = site("src/features/past/past.tsx");
		const regressed = read(entry.file).replace(
			't("mobile.time.relative.just_now")',
			'"just now"',
		);
		expect(regressed).not.toBe(read(entry.file));
		expect(keyedSiteViolations(entry, regressed)).toEqual([
			expect.stringMatching(/un-keyed literal "just now"$/),
			"src/features/past/past.tsx: no longer renders mobile.time.relative.just_now",
		]);
	});

	it("flags a NEW spelling of a relative-age template, not only the old one", () => {
		const entry = site("src/team-bridge/model.ts");
		const source = `${read(entry.file)}\nexport const age = (n: number) => \`\${n} min ago\`;\n`;
		expect(keyedSiteViolations(entry, source)).toEqual([
			expect.stringMatching(/un-keyed literal "\$\{n\} min ago"$/),
		]);
	});

	it("flags a JSX title prop restored to English", () => {
		const entry = site("src/features/projects/projects.tsx");
		const regressed = read(entry.file).replace(
			'title={t("mobile.projects.title")}',
			'title="Projects"',
		);
		expect(keyedSiteViolations(entry, regressed)).toEqual([
			expect.stringMatching(/un-keyed literal "Projects"$/),
			"src/features/projects/projects.tsx: no longer renders mobile.projects.title",
		]);
	});

	it("ignores a retired word that survives only in a comment", () => {
		const entry = site("src/features/projects/projects.tsx");
		const source = `${read(entry.file)}\n// title was "Projects" before O3-a\n`;
		expect(keyedSiteViolations(entry, source)).toEqual([]);
	});

	it("does not count a key that survives only in a comment", () => {
		const entry = site("src/features/session/components/slash-sheet.tsx");
		const regressed = read(entry.file).replace(
			't("mobile.session.sheet_title.commands")',
			"undefined /* was mobile.session.sheet_title.commands */",
		);
		expect(keyedSiteViolations(entry, regressed)).toEqual([
			"src/features/session/components/slash-sheet.tsx: no longer renders mobile.session.sheet_title.commands",
		]);
	});
});

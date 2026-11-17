import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The phone's side of ADR 0010 §5's shared fixture (agent-server PR #399,
 * `internal/models/testdata/bridge_push_avatar_fixture.json` @ a02c6cc7, copied
 * byte-for-byte to the native module's androidTest assets so the emulator
 * runner renders the SAME rows).
 *
 * The phone computes neither initials nor tone; it draws what the cloud sends.
 * So what this suite pins is the contract between the fixture and the Kotlin
 * renderer's INPUTS, read from source because Node cannot run Kotlin:
 *  - the palette the tone indexes is core's `_PALETTE_LIGHT`, in order;
 *  - every fixture tone is a valid index, and the native parser's tone bound is
 *    the palette size;
 *  - every person row's initials pass the native parser's rule (≤ 2 code
 *    points, each a Unicode letter or number), and agent rows carry none.
 * The real Kotlin (parse → spec → bitmap pixel) runs on the emulator:
 * `TeamBridgePushTestRunner`'s `fixtureRows` case.
 */
const root = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const moduleDir = join(root, "modules/lop-team-bridge-push/android/src");
const kotlin = (name: string) =>
	readFileSync(
		join(moduleDir, "main/java/dev/localoperator/teambridge", name),
		"utf8",
	);

type FixtureSender = {
	name: string;
	kind: "person" | "agent";
	expect: { initials: string; tone: number };
};
const fixture = JSON.parse(
	readFileSync(
		join(moduleDir, "androidTest/assets/bridge_push_avatar_fixture.json"),
		"utf8",
	),
) as { senders: FixtureSender[]; conversations: unknown[] };

/** core `notification_avatar.py` `_PALETTE_LIGHT` (local-operator origin/main,
 *  read 2026-11-17), as ARGB. */
const CORE_PALETTE_LIGHT = [
	0xff2f6fb3, 0xff8a4fb0, 0xffb0476b, 0xffa8551e, 0xff3d7d3a, 0xff1e7a78,
	0xff5a5fc8, 0xff7a6345,
];

const kotlinPalette = (): number[] => {
	const source = kotlin("AvatarRenderer.kt");
	const start = source.indexOf("val PALETTE: IntArray = intArrayOf(");
	const block = source.slice(start, source.indexOf("\n  )", start));
	return [...block.matchAll(/0x([0-9A-Fa-f]{8})\.toInt\(\)/g)].map((m) =>
		Number.parseInt(m[1], 16),
	);
};

const TONES_CONST = /const val TONES = 8\b/;

/** The native parser's initials rule, restated for the fixture check. */
const DRAWABLE = /^[\p{L}\p{N}]{1,2}$/u;

describe("push avatar contract (ADR 0010 §5)", () => {
	it("draws on core's light palette, in tone order", () => {
		expect(kotlinPalette()).toEqual(CORE_PALETTE_LIGHT);
	});

	it("bounds the parsed tone by the palette size", () => {
		expect(kotlin("BridgePushPayload.kt")).toMatch(TONES_CONST);
		expect(CORE_PALETTE_LIGHT).toHaveLength(8);
	});

	it("carries ~30 sender rows covering persons, agents and empty initials", () => {
		expect(fixture.senders.length).toBeGreaterThanOrEqual(30);
		expect(fixture.senders.some((row) => row.kind === "agent")).toBe(true);
		expect(fixture.senders.some((row) => row.expect.initials === "")).toBe(
			true,
		);
	});

	it.each(fixture.senders.map((row) => [row.name, row] as const))(
		"%s: tone indexes the palette and initials are drawable or empty",
		(_name, row) => {
			expect(Number.isInteger(row.expect.tone)).toBe(true);
			expect(row.expect.tone).toBeGreaterThanOrEqual(0);
			expect(row.expect.tone).toBeLessThan(CORE_PALETTE_LIGHT.length);
			if (row.kind === "agent") {
				// An agent's face is the glyph, never its owner's letters.
				expect(row.expect.initials).toBe("");
			} else if (row.expect.initials !== "") {
				expect(row.expect.initials.normalize("NFC")).toMatch(DRAWABLE);
			}
		},
	);
});

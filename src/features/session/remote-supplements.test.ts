import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Capabilities } from "@/contracts";
import { capabilitiesSchema } from "@/contracts/schemas";
import { sessionSupplementsAvailable } from "./remote-supplements";

const screen = readFileSync("app/(app)/session/[id].tsx", "utf8");
const current: Capabilities = {
	remote_sessions: {
		supplements: true,
		supplement_kinds: ["document", "file", "sound"],
	},
};

describe("remote Highlight capability gate", () => {
	it.each([
		undefined,
		{},
		{ remote_sessions: { supplements: false } },
		{ remote_sessions: { supplements: true } },
		{
			remote_sessions: {
				supplements: true,
				supplement_kinds: ["document", "file"],
			},
		},
	])(
		"keeps older/partial peers usable without attempting Highlight reads: %j",
		(caps) => {
			expect(sessionSupplementsAvailable(caps, true)).toBe(false);
		},
	);
	it("accepts the explicit owner-routed document/file/sound contract", () => {
		const parsed = capabilitiesSchema.parse(current);
		expect(parsed.remote_sessions?.supplement_kinds).toEqual([
			"document",
			"file",
			"sound",
		]);
		expect(sessionSupplementsAvailable(parsed, true)).toBe(true);
	});
	it.each([undefined, {}, current])(
		"preserves local previews regardless of remote capability: %j",
		(caps) => {
			expect(sessionSupplementsAvailable(caps, false)).toBe(true);
		},
	);
	it("uses the gate for both the existing blocks and the owner-computer fallback", () => {
		expect(screen).not.toContain(
			"remoteConversation ? {} : runtime.supplements",
		);
		expect(screen).toContain("sessionSupplementsAvailable(");
		expect(screen).toContain("supplementsAvailable ? runtime.supplements : {}");
		expect(screen).toContain("remoteConversation && !supplementsAvailable");
		expect(screen).toContain("controlPolicy.allows(`supplement_${op}`)");
	});
});

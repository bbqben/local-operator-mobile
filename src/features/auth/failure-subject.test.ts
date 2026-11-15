import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { resetLocaleSource, setLocaleSource } from "@/i18n";
import { relayErrorFromResponse } from "@/relay";
import { failureSubject, transientCopy } from "./refusal";

/* M3 S3: four translation auditors on PR #265 (ur-GAP-C2, ru X1, hi X1, es)
 * found the TRANSIENT notice saying "Your computer पर …" / "Your computer is
 * reconnecting." inside an otherwise translated sentence. The provider's
 * transient memo hard-coded the English literal as the subject, where the
 * refusal memo above it already read `mobile.computers.your_computer`. Both now
 * go through `failureSubject`, so the two surfaces cannot drift apart again. */

/** The memo's dependency list: the last `[` to the end of the block. */
const DEPS_TAIL = /\[[^[\]]*$/;

const RADIENT = { mode: "radient", hostname: "h", tunnelId: "t" } as const;
const CUSTOM = {
	mode: "custom",
	baseUrl: "https://relay.example.com",
	allowInsecure: false,
} as const;

describe("failureSubject names the failing computer in the reader's language", () => {
	afterEach(() => resetLocaleSource());

	it("a chosen computer is named by its own name; a custom route by its address", () => {
		expect(
			failureSubject({
				computer: { name: "Studio Mac" },
				route: RADIENT,
				noRoute: "Radient",
			}),
		).toBe("Studio Mac");
		expect(
			failureSubject({
				computer: undefined,
				route: CUSTOM,
				noRoute: "Radient",
			}),
		).toBe("https://relay.example.com");
		expect(
			failureSubject({ computer: undefined, route: null, noRoute: "Radient" }),
		).toBe("Radient");
	});

	it.each([
		["fr", "Votre ordinateur"],
		["ur", "کمپیوٹر"],
		["ru", "Ваш компьютер"],
	])(
		"%s: an unnamed Radient computer is the catalogue's fallback, never English",
		(locale, expected) => {
			setLocaleSource(() => locale);
			expect(
				failureSubject({
					computer: undefined,
					route: RADIENT,
					noRoute: "Radient",
				}),
			).toBe(expected);
		},
	);

	it("fr: the transient notice built with that subject carries no English subject", () => {
		setLocaleSource(() => "fr");
		const error = relayErrorFromResponse({
			status: 503,
			header: () => "application/json",
			text: JSON.stringify({ detail: "d", kind: "wait_reconnect" }),
		});
		const copy = transientCopy(
			error,
			failureSubject({ computer: undefined, route: RADIENT, noRoute: "x" }),
		);
		const text = `${copy?.title ?? ""} ${copy?.body ?? ""}`;
		expect(text).toContain("Votre ordinateur");
		expect(text).not.toContain("Your computer");
	});
});

describe("the provider's transient memo resolves its subject through the catalogue", () => {
	/* Source-level for the reason refusal-memo-language.test.ts gives: Node cannot
	 * mount the provider (react-native, expo, the relay client). */
	const provider = readFileSync(
		resolve(import.meta.dirname, "connection-provider.tsx"),
		"utf8",
	);
	const start = provider.indexOf(
		"const transient = useMemo<RefusalCopy | null>(",
	);
	const block = provider.slice(start, provider.indexOf("\n\t]);", start));

	it("calls failureSubject and carries no English literal subject", () => {
		expect(start).toBeGreaterThan(-1);
		expect(block).toContain("failureSubject(");
		expect(block).not.toContain('"Your computer"');
	});

	it("names the reader's computer through the catalogue when no route exists", () => {
		/* Without this pin any other literal (`noRoute: "Radient"`, the refusal
		 *  memo's account-side subject) passes the two checks above, and the
		 *  notice would blame the account for a cause the computer named. */
		expect(block).toContain('noRoute: t("mobile.computers.your_computer")');
	});

	it("lists the language in its dependencies, so a language frame re-runs it", () => {
		const deps = block.match(DEPS_TAIL)?.[0] ?? "";
		expect(deps).toContain("language");
	});
});

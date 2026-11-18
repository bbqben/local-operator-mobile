import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* Node cannot mount the real Settings screen (its native styling stack), so —
 * like `settings-sign-out-wiring.test.ts` — this pins the wiring of the
 * account and connection actions. Rendered light/dark frames are the visual
 * evidence; these keep the variant choices from drifting back. */
const source = readFileSync(new URL("./settings.tsx", import.meta.url), "utf8");

/** The `<Button … />` element that carries `testID={CONTROL.<id>}`. */
const buttonWith = (id: string): string => {
	const at = source.indexOf(`testID={CONTROL.${id}}`);
	expect(at, `a control with testID CONTROL.${id}`).toBeGreaterThan(-1);
	const start = source.lastIndexOf("<Button", at);
	const end = source.indexOf("/>", at);
	return source.slice(start, end + 2);
};

describe("Settings: account deletion reads as destructive", () => {
	/* UX pass, settings: "Delete my Radient account" was a `quiet` button, the
	 * same neutral text as any link. It is the kit's `danger` action now; what it
	 * does — open the console's account page, where deletion happens — is
	 * unchanged. */
	it("is the danger variant", () => {
		const button = buttonWith("settingsDeleteAccount");
		expect(button).toContain('variant="danger"');
		expect(button).not.toContain('variant="quiet"');
	});

	it("still hands deletion to the Radient console's account page", () => {
		const button = buttonWith("settingsDeleteAccount");
		expect(button).toContain("WebBrowser.openBrowserAsync(");
		expect(button).toContain('"/dashboard/account"');
	});
});

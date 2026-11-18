import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEMES } from "@/ui/tokens.gen";
import { SWITCH_ROLES } from "@/ui/variants";
import { ratio } from "../../design/tokens/colour-math.mjs";

/**
 * The switch's colours (UX pass, settings, D-settings-p2..p4). The platform
 * defaults painted it: react-native-web's teal `#009688` thumb on the green
 * `accent` track, and on iOS a white thumb — which on the dark accent is the
 * kit's one hard prohibition (2.16:1, components.md § 2). On and off were hard
 * to tell apart in dark. The roles below are the fix; these pin them against
 * EVERY shipped palette, because a reader can pick any of them.
 */
/** Any step of the accent ramp: `accent`, `accent-muted`, `accent-border`… */
const ACCENT_ROLE = /^accent/;

describe("switch colour roles", () => {
	it("on is the accent track with the accent's own ink as the thumb", () => {
		expect(SWITCH_ROLES.on).toEqual({ track: "accent", thumb: "on-accent" });
	});

	it("off is a neutral track — never an accent step — with a raised thumb", () => {
		expect(SWITCH_ROLES.off.track).not.toMatch(ACCENT_ROLE);
		expect(SWITCH_ROLES.off).toEqual({
			track: "border-control",
			thumb: "elevated",
		});
	});

	it.each(THEMES.map((theme) => [theme.id, theme.colors] as const))(
		"%s: the thumb clears 3:1 on its track in both states, and the off track clears 3:1 on the page",
		(_id, colors) => {
			const c = colors as Record<string, string>;
			for (const state of ["on", "off"] as const) {
				const { track, thumb } = SWITCH_ROLES[state];
				expect(
					ratio(c[thumb] as string, c[track] as string),
					`${state}: ${thumb} on ${track}`,
				).toBeGreaterThanOrEqual(3);
			}
			/* The off track is the control's only boundary when off: it is the
			 *  structural ink, so it must read against the grounds a row sits on. */
			for (const ground of ["canvas", "surface"]) {
				expect(
					ratio(c[SWITCH_ROLES.off.track] as string, c[ground] as string),
					`off track on ${ground}`,
				).toBeGreaterThanOrEqual(3);
			}
		},
	);
});

describe("SwitchRow paints the roles on every platform", () => {
	const source = readFileSync(
		new URL("../features/sessions/sidebar-view-controls.tsx", import.meta.url),
		"utf8",
	);
	it("sets the thumb for both states, including react-native-web's on-thumb", () => {
		expect(source).toContain("SWITCH_ROLES");
		expect(source).toContain("thumbColor=");
		// react-native-web reads the ON thumb from `activeThumbColor` and ignores
		// `thumbColor` while on; without it the teal default comes back.
		expect(source).toContain("activeThumbColor");
		// iOS paints the off track's fill from `ios_backgroundColor`.
		expect(source).toContain("ios_backgroundColor");
	});
});

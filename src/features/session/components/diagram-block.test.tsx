import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real Markdown and DiagramBlock trees, mounted through react-native-web;
// only native adapters are replaced. This proves dispatch, fallback and theme
// wiring, not native pixels (the pull request says what ran on a device).
const host = vi.hoisted(() => ({
	dark: false,
	copied: [] as string[],
	window: { width: 390, height: 844 },
}));

vi.mock("react-native-svg", async () => {
	const { createElement } = await import("react");
	const shape =
		(name: string) =>
		({ children, ...props }: { children?: ReactNode }) =>
			createElement(`svg-${name}`, props as Record<string, unknown>, children);
	return {
		default: shape("root"),
		G: shape("g"),
		Path: shape("path"),
		Rect: shape("rect"),
		Circle: shape("circle"),
		Ellipse: shape("ellipse"),
		Line: shape("line"),
		Polygon: shape("polygon"),
		Polyline: shape("polyline"),
		Text: shape("text"),
		TSpan: shape("tspan"),
		Defs: shape("defs"),
		LinearGradient: shape("lg"),
		Stop: shape("stop"),
	};
});
vi.mock("expo-clipboard", () => ({
	setStringAsync: vi.fn(async (text: string) => {
		host.copied.push(text);
	}),
}));
vi.mock("react-native", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-native")>();
	return { ...actual, useWindowDimensions: () => host.window };
});
vi.mock("@/ui/appearance", async () => {
	const { THEMES } = await import("@/ui/tokens.gen");
	const pick = (mode: "light" | "dark") => {
		const entry = THEMES.find((theme) => theme.mode === mode);
		if (!entry) throw new Error(mode);
		return entry;
	};
	const light = pick("light");
	const dark = pick("dark");
	return {
		useTokenColor: () => "#ffffff",
		useTheme: () => ({ active: host.dark ? dark : light }),
	};
});
vi.mock("@/ui/direction", () => ({
	useIsRTL: () => false,
	LTR_TEXT: { writingDirection: "ltr" },
}));
vi.mock("@/ui/text-scale-provider", () => ({
	useTextScale: () => ({ effectiveScale: 1 }),
}));
vi.mock("@/features/session/table-scroll-hook", () => ({
	forcedTableScroll: () => null,
}));

import { DIAGRAM_SOURCES } from "@/features/session/diagram-fixtures";
import {
	clearDiagramCache,
	renderDiagram,
} from "@/features/session/diagram-render";
import { diagramInnerWidth } from "@/features/session/diagram-source";
import { peleThemeVariables } from "@/features/session/diagram-theme";
import { t } from "@/i18n";
import { estimatedColumnWidth } from "@/ui/column";
import { THEMES } from "@/ui/tokens.gen";
import { Markdown } from "./markdown";

const FLOW = DIAGRAM_SOURCES.flowchart ?? "";
const fenced = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;

/** Draw `source` into the cache with exactly the request the component builds,
 *  as the component's own effect does after its first frame. */
const warm = (source: string, mode: "light" | "dark" = "light") => {
	const entry = THEMES.find((theme) => theme.mode === mode);
	if (!entry) throw new Error(mode);
	return renderDiagram({
		source,
		width: diagramInnerWidth(estimatedColumnWidth(host.window)),
		theme: peleThemeVariables((role) => entry.colors[role]),
		fonts: { sans: "Figtree", mono: "JetBrains Mono" },
	});
};

const markup = (text: string) =>
	renderToStaticMarkup(createElement(Markdown, { text }));

const FILL = /fill="(#[0-9a-f]{6})"/gi;
const fills = (html: string) =>
	new Set([...html.matchAll(FILL)].map((m) => m[1]));

beforeEach(() => {
	clearDiagramCache();
	host.dark = false;
	host.copied = [];
});

describe("a mermaid fence in assistant markdown", () => {
	it("is the plain code block on the first frame, before Pele has answered", () => {
		const html = markup(fenced(FLOW));
		expect(html).toContain("flowchart TD");
		expect(html).not.toContain("<svg-root");
	});

	it("draws the diagram, in its own frame, once Pele has answered", async () => {
		await warm(FLOW);
		const html = markup(fenced(FLOW));
		expect(html).toContain("<svg-root");
		expect(html).toContain("<svg-text");
		expect(html).toContain("mermaid");
		// The listing is not shown beside the picture.
		expect(html).not.toContain("flowchart TD");
	});

	it("stays code for an unterminated fence even when the same text is drawn", async () => {
		await warm(FLOW);
		const open = `\`\`\`mermaid\n${FLOW}`;
		const html = markup(open);
		expect(html).not.toContain("<svg-root");
		expect(html).toContain("flowchart TD");
	});

	it("leaves every other language alone", async () => {
		const html = markup("```ts\nconst a = 1;\n```");
		expect(html).toContain("const a = 1;");
		expect(html).not.toContain("<svg-root");
	});

	it("names the diagram for a screen reader and says what activating it does", async () => {
		await warm(FLOW);
		const html = markup(fenced(FLOW));
		expect(html).toContain('aria-label="flowchart diagram: Start"');
		// react-native-web has no DOM channel for `accessibilityHint`; the string
		// the native control is handed is the catalogue's.
		expect(t("mobile.session.diagram.copy_hint")).toBe(
			"Copies the diagram source",
		);
		expect(html).toContain('role="button"');
		// The drawing itself is out of the reading order.
		expect(html).toContain('aria-hidden="true"');
	});

	it("falls back to the code block with Pele's own message when it cannot draw", async () => {
		const broken = "flowchart TD\n  A[Start --> B";
		await warm(broken);
		const html = markup(fenced(broken));
		expect(html).not.toContain("<svg-root");
		expect(html).toContain("Couldn’t draw this diagram");
		expect(html).toContain("A[Start --&gt; B");
		const refusal = await warm(broken);
		if (!refusal.ok) expect(html).toContain(refusal.message.slice(0, 20));
	});

	it("redraws from the active theme's colours", async () => {
		await warm(FLOW, "light");
		await warm(FLOW, "dark");
		const light = markup(fenced(FLOW));
		host.dark = true;
		const dark = markup(fenced(FLOW));
		const lightFills = fills(light);
		const darkFills = fills(dark);
		expect(lightFills.size).toBeGreaterThan(0);
		expect(darkFills.size).toBeGreaterThan(0);
		for (const colour of lightFills) expect(darkFills.has(colour)).toBe(false);
	});

	it("puts no event handler, script or link into the drawn markup", async () => {
		const hostile =
			'flowchart TD\n  A["<img src=x onerror=alert(1)>"] --> B["javascript:alert(1)"]\n  click A "https://evil.example/x"';
		await warm(hostile);
		const html = markup(fenced(hostile));
		expect(html).toContain("<svg-root");
		expect(html).not.toMatch(/<script|<a |href=|onerror=|<img|<foreignObject/i);
	});
});

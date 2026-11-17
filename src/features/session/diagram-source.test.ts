import { describe, expect, it } from "vitest";

import {
	diagramLayout,
	isDiagramBlock,
	MIN_DIAGRAM_SCALE,
} from "@/features/session/diagram-source";
import { type Block, parseMarkdown } from "@/features/session/markdown";

type Code = Extract<Block, { kind: "code" }>;

const codeBlocks = (text: string): Code[] =>
	parseMarkdown(text).filter((block): block is Code => block.kind === "code");

describe("which fences draw as a diagram", () => {
	it("draws a closed mermaid fence", () => {
		const [block] = codeBlocks("```mermaid\nflowchart TD\n  A --> B\n```");
		expect(block && isDiagramBlock(block)).toBe(true);
	});

	it("accepts the language in any case", () => {
		const [block] = codeBlocks("```Mermaid\nflowchart TD\n  A --> B\n```");
		expect(block && isDiagramBlock(block)).toBe(true);
	});

	it("keeps every other language as code", () => {
		for (const language of ["", "ts", "mermaidjs", "sh", "json"]) {
			const [block] = codeBlocks(`\`\`\`${language}\nA --> B\n\`\`\``);
			expect(block && isDiagramBlock(block)).toBe(false);
		}
	});

	it("keeps an unterminated fence as plain code while it streams", () => {
		const [block] = codeBlocks("```mermaid\nflowchart TD\n  A --> B");
		expect(block?.unterminated).toBe(true);
		expect(block && isDiagramBlock(block)).toBe(false);
	});

	it("flips to a diagram on the frame that carries the closing fence", () => {
		const text = "Here:\n```mermaid\nflowchart TD\n  A --> B\n```\nDone.";
		// Every prefix up to and including the closing fence's first backtick
		// stays code; the full fence line is the frame that draws.
		const closeAt = text.indexOf("\n```\n") + 1;
		for (let end = 1; end < closeAt + 3; end += 1) {
			const frame = codeBlocks(text.slice(0, end))[0];
			if (frame) expect(isDiagramBlock(frame)).toBe(false);
		}
		const done = codeBlocks(text.slice(0, closeAt + 3))[0];
		expect(done && isDiagramBlock(done)).toBe(true);
	});

	it("does not mark a closed fence as unterminated", () => {
		const [block] = codeBlocks("```ts\nconst a = 1;\n```");
		expect(block).toEqual({
			kind: "code",
			language: "ts",
			lines: ["const a = 1;"],
		});
	});

	it("takes only the diagram's own lines as its source", () => {
		const [block] = codeBlocks("```mermaid\nflowchart TD\n  A --> B\n```");
		expect(block?.lines.join("\n")).toBe("flowchart TD\n  A --> B");
	});
});

describe("fitting a diagram to the column", () => {
	it("draws at full size when it fits and never enlarges", () => {
		const layout = diagramLayout({ width: 200, height: 100 }, 340);
		expect(layout).toEqual({
			scale: 1,
			width: 200,
			height: 100,
			scrolls: false,
		});
	});

	it("shrinks to the column down to the floor", () => {
		const layout = diagramLayout({ width: 400, height: 200 }, 300);
		expect(layout.scale).toBeCloseTo(0.75, 5);
		expect(layout.width).toBeCloseTo(300, 5);
		expect(layout.scrolls).toBe(false);
	});

	it("holds the floor and scrolls sideways beyond it", () => {
		const layout = diagramLayout({ width: 800, height: 400 }, 300);
		expect(layout.scale).toBe(MIN_DIAGRAM_SCALE);
		expect(layout.width).toBeCloseTo(560, 5);
		expect(layout.height).toBeCloseTo(280, 5);
		expect(layout.scrolls).toBe(true);
	});

	it("survives a column that has not been measured", () => {
		const layout = diagramLayout({ width: 300, height: 100 }, 0);
		expect(layout.scale).toBe(MIN_DIAGRAM_SCALE);
		expect(Number.isFinite(layout.width)).toBe(true);
	});
});

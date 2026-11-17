import type { Block } from "@/features/session/markdown";

/**
 * Which fenced blocks become diagrams, and how a drawn diagram is sized.
 *
 * Pure and free of `react-native` so Node tests can pin both rules.
 */

/** A block draws as a diagram only when it is a CLOSED ```mermaid fence.
 *
 *  Closed, because the transcript re-renders on every streamed frame: an open
 *  fence holds half a diagram, which Pele would either refuse (a flash of error
 *  text) or draw wrongly (a flowchart that grows an edge per token). Until the
 *  closing fence arrives the block stays the plain code listing it always was,
 *  and the diagram replaces it once, when it is whole — the desktop UI's rule. */
export const isDiagramBlock = (
	block: Extract<Block, { kind: "code" }>,
): boolean =>
	block.unterminated !== true && block.language.toLowerCase() === "mermaid";

/** Below this the labels (14 pt at full size) are under ~10 pt and stop being
 *  readable on a phone; a diagram wider than the column at this scale scrolls
 *  sideways instead of shrinking further. */
export const MIN_DIAGRAM_SCALE = 0.7;

export type DiagramLayout = {
	scale: number;
	width: number;
	height: number;
	/** The drawing is wider than the column and scrolls horizontally. */
	scrolls: boolean;
};

/** Fit a `width` x `height` diagram to a column `available` points wide:
 *  full size when it fits, otherwise shrunk to the column down to the floor,
 *  otherwise at the floor and scrolling. Never enlarged — a three-node chart at
 *  3x is a poster, not a figure. */
export const diagramLayout = (
	size: { width: number; height: number },
	available: number,
): DiagramLayout => {
	const room = Math.max(1, available);
	const fit = Math.min(1, room / size.width);
	const scale = Math.max(MIN_DIAGRAM_SCALE, fit);
	const width = size.width * scale;
	return {
		scale,
		width,
		height: size.height * scale,
		scrolls: width > room + 0.5,
	};
};

/** Padding inside a diagram's frame, each side, in points. */
export const DIAGRAM_FRAME_PAD = 8;

/** The width the drawing may use inside a frame in a column `column` wide: the
 *  column less both paddings and the 1 pt border each side. */
export const diagramInnerWidth = (column: number): number =>
	Math.max(1, column - 2 * DIAGRAM_FRAME_PAD - 2);

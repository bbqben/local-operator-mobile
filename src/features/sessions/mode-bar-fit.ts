/**
 * Whether the drawer's Agents | Team Bridge track can split into equal halves.
 *
 * Kept free of `react-native` so Node can pin the arithmetic: there is no
 * layout engine in the unit suite, so the component measures and this decides.
 */
export type ModeBarSegmentMode = "equal" | "proportional";

/** The track's `p-1`: the inset between its measured box and its segments. */
export const MODE_TRACK_INSET = 4;
/** The track's `gap-1` between the two segments. */
export const MODE_SEGMENT_GAP = 4;
/** What a segment adds around its label: the content's `px-2` on both sides
 *  (16) and its 1 pt `border` on both sides (2). */
export const MODE_SEGMENT_CHROME = 18;

/**
 * `"equal"` when every segment's natural width fits in an equal share of the
 * track (`n × widest + gaps ≤ track`), otherwise `"proportional"`.
 *
 * `track` is the track's INNER width (inside its padding); `segments` are each
 * segment's natural width (label plus `MODE_SEGMENT_CHROME`). Anything not yet
 * measured — `null`, or a 0 from a box that has not laid out — answers
 * `"proportional"`, because that layout is the one that is correct without a
 * measurement: it can only ever under-use the track, never squeeze a label.
 */
export const modeBarSegmentMode = (
	track: number | null,
	segments: ReadonlyArray<number | null>,
	gap: number,
): ModeBarSegmentMode => {
	if (track === null || !(track > 0) || segments.length === 0)
		return "proportional";
	let widest = 0;
	for (const width of segments) {
		if (width === null || !(width > 0)) return "proportional";
		widest = Math.max(widest, width);
	}
	const needed = segments.length * widest + (segments.length - 1) * gap;
	return needed <= track ? "equal" : "proportional";
};

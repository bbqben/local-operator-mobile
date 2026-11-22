/**
 * The state behind the transcript's "Jump to latest" chip.
 *
 * The operator's rule (2026-11-21): a reader who has scrolled away from the end
 * is never yanked back by new output, and is never left without a way back that
 * says new output arrived. So the chip is shown on exactly one state:
 * `!atTail && arrived` — the reader left the end AND content landed below them
 * since. That equivalence is the whole contract; it lives here as arithmetic so
 * the list and its tests cannot drift about when the chip is up.
 *
 * WHY "CONTENT LANDED BELOW" IS A ROW FACT, NOT A HEIGHT FACT. The list's content
 * height grows for three unrelated reasons while a reader is away: an older
 * history page is inserted ABOVE them, a row's layout settles, or a new message /
 * a streaming row grows at the BOTTOM. Only the last is "new output", and the
 * operator's spec excludes the first by name. Height alone cannot tell them
 * apart; the bottom row can: a new message changes the last item's id, and a
 * streamed answer grows the last row's measured height. A top insert leaves both
 * unchanged.
 */

/** The chip's memory. */
export type JumpCue = {
	/** The list is following the end. Chip hidden iff this is true. */
	atTail: boolean;
	/** Content arrived at the bottom since the reader left it. */
	arrived: boolean;
};

/** Following the end, nothing new to announce. */
export const JUMP_CUE_AT_TAIL: JumpCue = { atTail: true, arrived: false };
/** Away from the end, nothing new to announce (or the chip was dismissed). */
export const JUMP_CUE_AWAY: JumpCue = { atTail: false, arrived: false };
/** Away, and new output arrived: the chip is up. */
export const JUMP_CUE_ARRIVED: JumpCue = { atTail: false, arrived: true };

/** Whether the chip is up. */
export const jumpCueShown = (cue: JumpCue): boolean =>
	!cue.atTail && cue.arrived;

/**
 * The tail decision (a scroll event, the hold's rest, a fold toggle, a jump)
 * folded into the cue. Returning the SAME object for an unchanged state is what
 * keeps a frame-rate caller from scheduling a render per scroll event.
 *
 * Reaching the end retires the announcement: the reader is already looking at
 * what the chip would offer.
 */
export const withAtTail = (cue: JumpCue, atTail: boolean): JumpCue => {
	if (atTail) return cue.atTail && !cue.arrived ? cue : JUMP_CUE_AT_TAIL;
	return cue.atTail ? JUMP_CUE_AWAY : cue;
};

/** New output landed below the reader; announce it only while they are away. */
export const withArrival = (cue: JumpCue): JumpCue =>
	cue.atTail || cue.arrived ? cue : JUMP_CUE_ARRIVED;

/** What the list last knew about its bottom row. */
export type BottomMark = {
	id: string | null;
	/** The row's last measured height, or null while it has none (unmounted). */
	height: number | null;
};

/** No bottom row yet: an empty list, or a list between sessions. */
export const NO_BOTTOM: BottomMark = { id: null, height: null };

/**
 * Sub-point growth that is a streamed line, not layout rounding. Heights arrive
 * from `onLayout` in platform points and the list already compares changed
 * viewports at half a point (`onLayout` in `transcript-list.tsx`); the same
 * tolerance here keeps a re-measure of an unchanged row from announcing output.
 */
export const BOTTOM_GROWTH_PT = 0.5;

/**
 * Remember the bottom row for the next content change.
 *
 * An unmounted bottom row keeps its last MEASURED height: the row is unmounted
 * precisely because the reader left the end, and forgetting the height there
 * would make the streamed growth that happens next unobservable. A new row
 * starts with no height until it lays out.
 */
export const nextBottomMark = (
	previous: BottomMark,
	id: string | null,
	height: number | null,
): BottomMark => {
	if (id === null) return NO_BOTTOM;
	if (height === null && previous.id === id && previous.height !== null)
		return previous;
	if (previous.id === id && previous.height === height) return previous;
	return { id, height };
};

/**
 * Whether this content change put NEW OUTPUT at the bottom.
 *
 * A changed last item id is a message or a turn bar arriving; a taller last row
 * is the streaming answer growing. A first measurement is not growth — scrolling
 * alone mounts rows and re-measures the estimate, and a chip raised by a scroll
 * would be a chip raised by nothing.
 */
export const bottomArrival = (
	previous: BottomMark,
	next: BottomMark,
): boolean => {
	if (previous.id === null || next.id === null) return false;
	if (previous.id !== next.id) return true;
	return (
		previous.height !== null &&
		next.height !== null &&
		next.height > previous.height + BOTTOM_GROWTH_PT
	);
};

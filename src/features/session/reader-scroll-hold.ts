/**
 * Whether the reader's own scroll currently owns a bottom-following list.
 *
 * WHY (TestFlight 1139, operator: "when trying to scroll up it anchors me back
 * to the bottom on each frame in a jitter until I apply enough scroll up force
 * to break free"). A tail-following list decides "at the tail" from a band
 * (48 pt here), so the first points of an upward drag still read as at the
 * tail, and every streamed row, layout commit or content-size event clamped
 * the offset back to the end under the finger. Only a flick that crossed the
 * band between two scroll events escaped.
 *
 * The rule: from a drag start until that scroll comes to rest (the drag ends
 * with no momentum, or the momentum ends), no programmatic follow runs. At
 * rest, `onRest` lets the list decide from the reader's own offset whether
 * they came back to the tail.
 *
 * Native only: iOS and Android raise drag/momentum events. The web list keeps
 * its own anchor handling (`releaseWebAnchor`), which this does not replace.
 */

/**
 * How long after the finger lifts a momentum scroll may still begin before the
 * drag counts as over. Both platforms raise `onMomentumScrollBegin` right
 * after `onScrollEndDrag`; until then the reader still owns the list.
 */
export const DRAG_RELEASE_MS = 120;

export type ReaderScrollHoldOptions = {
	/** The reader's scroll came to rest; decide follow from their offset. */
	onRest: () => void;
	/** Run `run` after `ms`; returns a cancel. Tests inject one. */
	schedule?: (run: () => void, ms: number) => () => void;
};

const timeout = (run: () => void, ms: number) => {
	const timer = setTimeout(run, ms);
	return () => clearTimeout(timer);
};

export function createReaderScrollHold(options: ReaderScrollHoldOptions) {
	const schedule = options.schedule ?? timeout;
	let active = false;
	let momentum = false;
	let release: (() => void) | null = null;
	const cancelRelease = () => {
		release?.();
		release = null;
	};
	const rest = () => {
		cancelRelease();
		if (!active) return;
		active = false;
		momentum = false;
		options.onRest();
	};
	return {
		get active() {
			return active;
		},
		beginDrag() {
			cancelRelease();
			active = true;
		},
		endDrag() {
			if (!active || momentum) return;
			cancelRelease();
			release = schedule(rest, DRAG_RELEASE_MS);
		},
		beginMomentum() {
			cancelRelease();
			active = true;
			momentum = true;
		},
		endMomentum: rest,
		/** The list unmounted: drop a pending release without resting. */
		dispose() {
			cancelRelease();
			active = false;
			momentum = false;
		},
	};
}

export type ReaderScrollHold = ReturnType<typeof createReaderScrollHold>;

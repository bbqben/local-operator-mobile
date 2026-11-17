/**
 * Whether the reader's own scroll currently owns a bottom-following list.
 *
 * WHY (TestFlight 1139, operator: "when trying to scroll up it anchors me back
 * to the bottom on each frame in a jitter until I apply enough scroll up force
 * to break free"). A tail-following list decides "at the tail" from a band
 * (44 pt in the Team Bridge thread, 48 pt in the agent transcript), so the
 * first points of an upward drag still read as at the tail, and every
 * streamed row, layout commit or content-size event clamped the offset back
 * to the end under the finger. Only a flick that crossed the band between two
 * scroll events escaped.
 *
 * THE RULE, shared by both lists so they cannot drift apart again (PR #289
 * round 1, N1): from the moment the reader starts scrolling until that scroll
 * comes to REST, no programmatic follow runs. At rest, `onRest` lets the list
 * decide from the reader's own CURRENT geometry whether they came back to the
 * end.
 *
 * - Native: a drag (`onScrollBeginDrag`) or a fling's glide
 *   (`onMomentumScrollBegin`) holds. The hold rests on `onMomentumScrollEnd`,
 *   or DRAG_RELEASE_MS after `onScrollEndDrag` when no glide began.
 * - Web has no drag/momentum events. A wheel or scroll key holds until the
 *   list has been idle for WEB_IDLE_MS. A pointer (mouse, pen or TOUCH —
 *   browsers raise pointer events for touch too, so the touch props stay the
 *   text-selection wiring's) holds for as long as it is down, and rests
 *   WEB_IDLE_MS after it lifts (PR #289 M2: a finger resting mid-drag must not
 *   time out). A lost `pointerup` (released outside the window) cannot pin the
 *   hold forever: while down, the hold is renewed by pointer moves and scroll
 *   events, and otherwise rests after WEB_DOWN_SAFETY_MS.
 */

/**
 * How long after the finger lifts a momentum glide may still begin before the
 * drag counts as over (N2). React Native raises `onMomentumScrollBegin` on the
 * same main-thread pass that ends the drag on iOS (`scrollViewWillEndDragging`
 * → `scrollViewWillBeginDecelerating`) and within a frame or two on Android's
 * fling; 120 ms is ~7 frames at 60 Hz, generous for that hand-off yet below
 * the ~150-200 ms a reader perceives as a hesitation before follow resumes.
 * It only decides WHEN a resting reader at the end is re-pinned; a reader
 * still moving is held by the glide itself.
 */
export const DRAG_RELEASE_MS = 120;
/**
 * Web idle before a wheel/key/lifted-pointer scroll counts as at rest (N2).
 * Browsers deliver wheel and inertial trackpad scroll events every frame
 * (~16 ms) while moving; macOS inertial scrolling can space its tail events
 * ~50-100 ms apart. 150 ms clears that tail without a perceptible delay
 * before following resumes.
 */
export const WEB_IDLE_MS = 150;
/**
 * A pointer held down without moving or scrolling for this long is treated
 * as released: a `pointerup` lost outside the window must not leave the list
 * unable to follow for good. Long enough for any real pause mid-drag.
 */
export const WEB_DOWN_SAFETY_MS = 4000;

/** Keys that scroll a focused web scroll container. */
const SCROLL_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"PageUp",
	"PageDown",
	"Home",
	"End",
	" ",
]);
/** Keys pressed on these act on the control (Space activates Load older), not
 * on the transcript, so they are not scroll intent (PR #208 NIT-1). */
const INTERACTIVE =
	'button,a,input,textarea,select,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[contenteditable="true"]';

type Closest = { closest?: (selector: string) => unknown };
type Container = { contains?: (node: unknown) => boolean };
export type KeyIntentEvent = {
	key: string;
	target?: unknown;
	currentTarget?: unknown;
};

const fromControl = (event: KeyIntentEvent) => {
	const target = event.target as Closest | null | undefined;
	const control = target?.closest?.(INTERACTIVE);
	if (!control || control === event.currentTarget) return false;
	const container = event.currentTarget as Container | null | undefined;
	return container?.contains ? container.contains(control) : true;
};

/** Whether a key event is the reader scrolling the list (not a control). */
export const isScrollKey = (event: KeyIntentEvent) =>
	SCROLL_KEYS.has(event.key) && !fromControl(event);

/** Web scroll-intent handlers; every one is absent on native. */
export type ReaderScrollWebHandlers = Partial<{
	onWheel: () => void;
	onPointerDown: () => void;
	onPointerMove: () => void;
	onPointerUp: () => void;
	onPointerCancel: () => void;
	onKeyDown: (event: KeyIntentEvent) => void;
}>;

export type ReaderScrollHoldOptions = {
	/** The reader's scroll came to rest; decide follow from CURRENT geometry. */
	onRest: () => void;
	/**
	 * A reader scroll began or continued (every begin, not only the first):
	 * cancel any programmatic move in flight.
	 */
	onBegin?: () => void;
	/** Web: wheel/pointer/key holds with idle release; native: drag/momentum. */
	web: boolean;
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
	let down = false;
	let release: (() => void) | null = null;
	const cancelRelease = () => {
		release?.();
		release = null;
	};
	const arm = (ms: number) => {
		cancelRelease();
		release = schedule(rest, ms);
	};
	const rest = () => {
		cancelRelease();
		down = false;
		if (!active) return;
		active = false;
		momentum = false;
		options.onRest();
	};
	const begin = () => {
		cancelRelease();
		active = true;
		options.onBegin?.();
	};
	/** Web wheel / key / scrollbar: held until idle (or until a lift). */
	const nudge = () => {
		begin();
		arm(down ? WEB_DOWN_SAFETY_MS : WEB_IDLE_MS);
	};
	return {
		get active() {
			return active;
		},
		beginDrag() {
			begin();
			// A glide caught by a new drag is over: without this reset the
			// drag's end saw `momentum` still set and never released (PR #289
			// M1 / Q1-1).
			momentum = false;
			// Web may raise a begin-drag with no end/momentum after it.
			if (options.web) arm(down ? WEB_DOWN_SAFETY_MS : WEB_IDLE_MS);
		},
		endDrag() {
			if (!active || momentum) return;
			arm(DRAG_RELEASE_MS);
		},
		beginMomentum() {
			begin();
			momentum = true;
		},
		endMomentum: rest,
		/**
		 * Any scroll event. Native: nothing (drag/momentum bound the hold).
		 * Web: a held scroll restarts its idle clock, or its safety clock
		 * while a pointer is still down.
		 */
		scrolled() {
			if (!active || !options.web) return;
			arm(down ? WEB_DOWN_SAFETY_MS : WEB_IDLE_MS);
		},
		/** Spread onto the list on web (empty on native). */
		webHandlers: (options.web
			? {
					onWheel: nudge,
					onPointerDown: () => {
						begin();
						down = true;
						arm(WEB_DOWN_SAFETY_MS);
					},
					onPointerMove: () => {
						if (!down) return;
						begin();
						arm(WEB_DOWN_SAFETY_MS);
					},
					onPointerUp: () => {
						if (!down) return;
						down = false;
						if (active) arm(WEB_IDLE_MS);
					},
					onPointerCancel: () => {
						if (!down) return;
						down = false;
						if (active) arm(WEB_IDLE_MS);
					},
					onKeyDown: (event: KeyIntentEvent) => {
						if (isScrollKey(event)) nudge();
					},
				}
			: {}) as ReaderScrollWebHandlers,
		/** The list unmounted: drop a pending release without resting (m2). */
		dispose() {
			cancelRelease();
			active = false;
			momentum = false;
			down = false;
		},
	};
}

export type ReaderScrollHold = ReturnType<typeof createReaderScrollHold>;

/**
 * The tail decision at rest, from the CURRENT geometry (PR #289 Q1-2).
 *
 * The scroll-event `atTail` is stale at rest: content that streamed in while
 * the finger was still raised no scroll event, so a reader 30 pt up with
 * 240 pt arriving underneath still read as "at the tail" and was pinned to
 * the end on release. Distance is measured against the latest content height.
 */
export const restsAtTail = (geometry: {
	offsetY: number;
	viewportPt: number;
	contentPt: number;
	bandPt: number;
}): boolean =>
	geometry.contentPt - geometry.offsetY - geometry.viewportPt < geometry.bandPt;

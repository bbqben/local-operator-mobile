/**
 * Which list rows may READ their profile photo: the ones the reader can see.
 *
 * WHY. The Team Bridge drawer is a `ScrollView` that mounts every People and
 * Chiefs-of-staff row at once, and each mounted agent row used to ask the hub
 * for its photo. An organization with ~120 agents therefore sent ~120 avatar
 * reads per drawer open (TestFlight 1157, 2026-11-17: 119 endpoint-avatar GETs
 * in one burst), all from the account's 120/min `reads` bucket that the
 * directory and settings reads share. The avatar cache now holds hash-pinned
 * photos and caps concurrency (`src/team-bridge/avatars.ts`); this gate makes
 * the FIRST open read only the rows on screen, plus a margin so a slow scroll
 * finds photos already there.
 *
 * HOW. The list publishes a signal on layout, content-size change and scroll;
 * each photo control measures itself in the window when it fires and latches
 * "seen" once it intersects the visible band. Latching (never un-seeing) keeps
 * a scrolled-past photo on screen and its read single. Outside a list that
 * provides the signal (the thread, the profile sheet), every photo is "seen"
 * at once: those surfaces show one or a handful of marks.
 *
 * Pure parts live here so a Node test can pin them without React Native.
 */

/** Extra band above and below the window, in points: about three rows. */
export const AVATAR_VIEWPORT_MARGIN = 160;

/**
 * Whether a laid-out box (window coordinates) touches the band
 * `[-margin, windowHeight + margin]`. A box with no size has not been laid out
 * yet (`measureInWindow` answers zeros before layout): not seen.
 */
export function inAvatarViewport(
	box: { y: number; width: number; height: number },
	windowHeight: number,
	margin: number = AVATAR_VIEWPORT_MARGIN,
): boolean {
	if (box.width <= 0 && box.height <= 0) return false;
	return box.y + box.height >= -margin && box.y <= windowHeight + margin;
}

export interface ViewportSignal {
	subscribe(listener: () => void): () => void;
	emit(): void;
}

/** A plain listener set: the list emits, mounted photo controls re-measure. */
export function createViewportSignal(): ViewportSignal {
	const listeners = new Set<() => void>();
	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		emit() {
			for (const listener of [...listeners]) listener();
		},
	};
}

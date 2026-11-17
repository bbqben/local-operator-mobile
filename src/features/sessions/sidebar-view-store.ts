import { createStore, type StoreApi } from "zustand/vanilla";

import {
	DEFAULT_SIDEBAR_VIEW,
	parseSidebarView,
	SIDEBAR_VIEW_KEY,
	type SidebarView,
	serializeSidebarViewOver,
} from "@/features/sessions/sidebar-view";

/**
 * The drawer's view preference, held in memory and written through to the
 * device store — the theme preference's pattern (`ui/appearance.tsx`), minus
 * the React effect: the setter persists, so the drawer's quick sheet and the
 * Settings section (two writers, one value) cannot race an effect for it.
 *
 * The storage port is INJECTED so this file stays importable from Node; the
 * app binds it to `deviceStore` in `use-sidebar-view.ts`.
 */
export type SidebarViewStorage = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
};

export type SidebarViewState = {
	view: SidebarView;
	/** Whether the stored view has been read. */
	hydrated: boolean;
	/** Read the stored view once. Safe to call from every mount. */
	hydrate: () => Promise<void>;
	/** Replace the whole view (the module's helpers build the next one). */
	setView: (next: SidebarView) => void;
};

export function createSidebarViewStore(
	storage: () => SidebarViewStorage,
): StoreApi<SidebarViewState> {
	let reading: Promise<void> | null = null;
	/* A tap made before the stored value arrives wins: hydration only fills the
	 *  default, it never undoes a choice (the same rule as `hydrateThemeSelection`).
	 *
	 *  Tracked PER FIELD, not as one flag (review round 1, M2): the tap's `next`
	 *  was built from the DEFAULT the reader saw, so keeping it whole would write
	 *  default values over every stored field the reader never touched. On
	 *  arrival the stored view is kept and only the touched fields override it. */
	const touched = new Set<keyof SidebarView>();
	/* What was last read or written: the bytes, and the view they parsed to.
	 *  Writes go field-wise over it (`serializeSidebarViewOver`, QA round 1,
	 *  Q-2), so a value this build cannot display survives a tap on another
	 *  field. Null until the first successful read; nothing persists before. */
	let stored: { raw: string | null; view: SidebarView } | null = null;
	const persist = (view: SidebarView) => {
		const base = stored ?? { raw: null, view: DEFAULT_SIDEBAR_VIEW };
		const raw = serializeSidebarViewOver(base.raw, base.view, view);
		stored = { raw, view };
		storage()
			.set(SIDEBAR_VIEW_KEY, raw)
			.catch(() => {
				// A failed write costs persistence across a relaunch, not the
				// arrangement on screen, and there is nobody to tell mid-tap.
			});
	};
	return createStore<SidebarViewState>((set, get) => ({
		view: DEFAULT_SIDEBAR_VIEW,
		hydrated: false,
		hydrate: () => {
			if (reading) return reading;
			reading = storage()
				.get(SIDEBAR_VIEW_KEY)
				.then((raw) => {
					const read = parseSidebarView(raw);
					stored = { raw, view: read };
					if (touched.size === 0) {
						set({ view: read, hydrated: true });
						return;
					}
					const current = get().view;
					const merged: SidebarView = { ...read };
					for (const key of touched)
						Object.assign(merged, { [key]: current[key] });
					set({ view: merged, hydrated: true });
					// Early taps were held back (see `setView`); the disk gets the merge.
					persist(merged);
				})
				.catch(() => {
					/* An unreadable store (a locked background launch) is NOT an empty
					 * one. It used to hydrate the default, after which any tap wrote
					 * defaults over every stored field. Stay unhydrated — the list
					 * still draws with the default — and let the next `hydrate` (the
					 * app's next `active`) read again. */
					reading = null;
				});
			return reading;
		},
		setView: (next) => {
			const prev = get().view;
			if (next === prev) return;
			for (const key of Object.keys(next) as (keyof SidebarView)[]) {
				if (JSON.stringify(next[key]) !== JSON.stringify(prev[key]))
					touched.add(key);
			}
			set({ view: next });
			/* Before the stored view is read, `next` was built from the DEFAULT, so
			 *  writing it whole would store defaults over fields the reader never
			 *  touched; hydration writes the merge instead. */
			if (get().hydrated) persist(next);
		},
	}));
}

/**
 * Read the stored view now, and again on every `active` until a read succeeds
 * (`hydrate` is a no-op once read). Returns the unsubscribe.
 *
 * Called from the ROOT layout at boot, not only from the screens that show the
 * view (QA round 1, Q-1): the first read is also what adopts a value an earlier
 * build left in the sealed device family (`state/preference-store.ts`), and
 * every sign-in purges that family. Waiting for the drawer to mount meant a
 * first post-update launch that ended in a sign-in lost the view; the theme
 * has always been read at boot by `ThemeProvider`, so it did not.
 */
export function startSidebarViewHydration(
	store: StoreApi<SidebarViewState>,
	subscribeActive: (listener: () => void) => () => void,
): () => void {
	void store.getState().hydrate();
	/* A read that failed (locked background launch) left the store unhydrated;
	 *  try again once the phone is unlocked. */
	return subscribeActive(() => {
		void store.getState().hydrate();
	});
}

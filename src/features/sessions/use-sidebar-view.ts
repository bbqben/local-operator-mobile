import { useEffect } from "react";
import { useStore } from "zustand";

import type { SidebarView } from "@/features/sessions/sidebar-view";
import {
	createSidebarViewStore,
	startSidebarViewHydration,
} from "@/features/sessions/sidebar-view-store";
import { preferenceStore, subscribeAppActive } from "@/state/preferences";

/**
 * The app's one sidebar-view store, bound to the preference store — NOT the
 * sealed device family, which every sign-in purges (`state/preference-store.ts`). One instance so
 * the drawer's quick sheet, the drawer itself and the Settings section all read
 * and write the same value — a second instance would be a second answer.
 */
export const sidebarViewStore = createSidebarViewStore(() => preferenceStore);

/** The reader's drawer view and its setter; reads the stored view on mount. */
export function useSidebarView(): {
	view: SidebarView;
	setView: (next: SidebarView) => void;
} {
	const view = useStore(sidebarViewStore, (state) => state.view);
	const setView = useStore(sidebarViewStore, (state) => state.setView);
	useSidebarViewHydration();
	return { view, setView };
}

/** Read the stored view on mount, retrying on `active` after a failed read.
 *  Mounted at the root as well (`app/_layout.tsx`), so the view is read — and
 *  adopted from the sealed family — at boot, before any sign-in purge. */
export function useSidebarViewHydration(): void {
	useEffect(
		() => startSidebarViewHydration(sidebarViewStore, subscribeAppActive),
		[],
	);
}

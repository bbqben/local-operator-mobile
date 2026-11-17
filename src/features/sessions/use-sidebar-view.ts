import { useEffect } from "react";
import { useStore } from "zustand";

import type { SidebarView } from "@/features/sessions/sidebar-view";
import { createSidebarViewStore } from "@/features/sessions/sidebar-view-store";
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
	useEffect(() => {
		void sidebarViewStore.getState().hydrate();
		/* A read that failed (locked background launch) left the store unhydrated;
		 *  try again once the phone is unlocked. `hydrate` is a no-op once read. */
		return subscribeAppActive(() => {
			void sidebarViewStore.getState().hydrate();
		});
	}, []);
	return { view, setView };
}

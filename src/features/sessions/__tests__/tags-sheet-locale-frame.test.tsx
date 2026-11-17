/**
 * The conversation Tags sheet repaints its keyed copy on a late backend
 * language frame, while it stays mounted (O3-b).
 *
 * WHY THIS IS A MOUNTED TEST. The sheet is a long-lived overlay: it can stay
 * open while the config stream delivers the backend's language, and its owner
 * (the conversation list) is not guaranteed to re-render on that frame. The
 * sheet therefore subscribes itself through `useLocaleFrame`; a source-text
 * assertion could only prove the call is present, not that a frame moves the
 * painted words. So this test mounts the real sheet through react-dom with the
 * same leaf mocks `projects/__tests__/locale-frame-mounted.test.tsx` uses, moves
 * ONLY the language through the config store's real reducer, and reads back
 * what painted.
 *
 * ENGLISH-FIRST CAVEAT. The sheet's new O3-b keys (`mobile.sidebar.tags.*`)
 * ship English-first, so for now every locale renders their English fallback
 * and fr/ur cannot be told apart through them. The repaint itself is proved on
 * the two keys the sheet renders that ARE translated (`relay.chrome.row.tags`
 * for the title, `mobile.common.try_again` for the pinned retry); the new keys
 * are asserted to paint the active locale's rendering, which tightens to a
 * real fr → ur difference as soon as their translations land.
 */
import {
	act,
	createElement,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";
import type { TagRef } from "@/contracts";
import { renderFor, resetLocaleSource, setLocaleSource } from "@/i18n";
import { createConfigStore } from "@/state/config-store";
import { type DomShim, installDomShim } from "@/testing/dom-shim";

const host = vi.hoisted(() => ({
	texts: [] as string[],
	store: null as unknown as ReturnType<
		typeof import("@/state/config-store").createConfigStore
	>,
}));

function strings(node: unknown): string[] {
	if (typeof node === "string") return [node];
	if (Array.isArray(node)) return node.flatMap(strings);
	return [];
}

/** Records every string prop and string child it is handed, and renders any
 *  element-valued prop (a sheet's `footer`) so nested copy is recorded too. */
function Recorder(props: Record<string, unknown>): ReactNode {
	const nested: ReactNode[] = [];
	for (const [name, value] of Object.entries(props)) {
		if (name === "children") continue;
		if (typeof value === "string") host.texts.push(value);
		else if (isValidElement(value)) nested.push(value);
	}
	const children =
		typeof props.children === "function"
			? (props.children as (state: { pressed: boolean }) => ReactNode)({
					pressed: false,
				})
			: (props.children as ReactNode);
	host.texts.push(...strings(children));
	return createElement(Fragment, null, ...nested, children ?? null);
}

vi.mock("react-native", () => ({
	View: Recorder,
	Text: Recorder,
	Pressable: Recorder,
}));
vi.mock("lucide-react-native", () => ({ Check: () => null }));
vi.mock("@/features/auth/connection-provider", () => ({
	/* No transport: the sheet's catalogue read lands in its error state, the
	 *  state that renders the most keyed copy at once (alert, pinned retry,
	 *  Remove all and its confirm dialog). */
	useConnection: () => ({ relay: () => null }),
	useConnectionState: () => "ready:1",
	useLocaleFrame: () => useStore(host.store, (state) => state.language),
}));
vi.mock("@/relay", () => ({
	isRelayError: () => false,
	TRANSPORT_SENTENCE: "transport",
}));
vi.mock("@/ui/appearance", () => ({ useTokenColor: () => "#000000" }));
vi.mock("@/ui/layout", () => ({ TOUCH_FLOOR: 44 }));
for (const leaf of [
	"alert",
	"button",
	"dialog",
	"empty-state",
	"sheet",
	"skeleton",
]) {
	vi.doMock(`@/ui/components/${leaf}`, () => ({
		Alert: Recorder,
		Button: Recorder,
		Dialog: Recorder,
		EmptyState: Recorder,
		Sheet: Recorder,
		Skeleton: () => null,
	}));
}

const WORK: TagRef = { id: "d28b35a273", name: "Work" };

let dom: DomShim;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
	host.store = createConfigStore({ now: () => 1 });
	host.texts = [];
	setLocaleSource(() => host.store.getState().language);
	dom = installDomShim();
	root = createRoot(dom.container as Element);
});
afterEach(async () => {
	await act(async () => root.unmount());
	dom.dispose();
	resetLocaleSource();
});

const frame = (language: string, at: number): void =>
	host.store
		.getState()
		.applyFrame({ changed_keys: ["language"], language }, at);

/** Keys this state renders that already have shipped translations. */
const TRANSLATED = [
	"relay.chrome.row.tags",
	"mobile.common.try_again",
] as const;
/** The O3-b keys the error state renders (English-first, see header). */
const O3B = [
	"mobile.sidebar.tags.load_failed_title",
	"mobile.sidebar.tags.load_failed_body",
	"mobile.sidebar.tags.remove_all",
	"mobile.sidebar.tags.remove_all_title",
	"mobile.sidebar.tags.remove_all_body",
	"mobile.sidebar.tags.remove_all_confirm",
] as const;

describe("a mounted Tags sheet repaints on a language frame", () => {
	it("follows fr → ur without a close/reopen", async () => {
		const { SessionTagsSheet } = await import("@/features/sessions/tags-sheet");
		frame("fr", 2);
		await act(async () =>
			root.render(
				createElement(SessionTagsSheet, {
					visible: true,
					sessionId: "s1",
					tags: [WORK],
					primary: WORK.id,
					onClose: () => undefined,
				}),
			),
		);
		await act(async () => undefined);
		for (const key of [...TRANSLATED, ...O3B])
			expect(host.texts).toContain(renderFor(key, {}, "fr"));

		host.texts = [];
		await act(async () => frame("ur", 3));
		for (const key of TRANSLATED) {
			// Guard the proof itself: the two locales must differ for this key.
			expect(renderFor(key, {}, "ur")).not.toBe(renderFor(key, {}, "fr"));
			expect(host.texts).toContain(renderFor(key, {}, "ur"));
			expect(host.texts).not.toContain(renderFor(key, {}, "fr"));
		}
		for (const key of O3B)
			expect(host.texts).toContain(renderFor(key, {}, "ur"));
	});
});

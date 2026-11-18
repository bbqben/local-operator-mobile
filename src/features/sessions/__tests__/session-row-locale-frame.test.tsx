/**
 * A mounted conversation row repaints its keyed copy on a late backend language
 * frame (PR #302 agent review R1 / QA Q2).
 *
 * THE DEFECT. `SessionRow` is memoised on the session's identity (perf audit
 * P11, `session-row-renders.test.ts`), and the conversation list re-renders it
 * only when a prop moves. `t()` reads the locale at call time, but nothing
 * re-rendered an already-mounted row when the config stream moved the
 * language: the "new" marker, the agents count chip and the row's tag
 * announcement kept the old language until the minute tick moved `now`
 * (`conversations-pane.tsx`), up to 60 s later.
 *
 * WHY A MOUNTED TEST. Only a real render through the memo proves a frame moves
 * the painted words; a source assertion could prove the hook call is present,
 * not that it reaches the chips. So the REAL `SessionRow` renders the REAL
 * `ListRow` (where the chips live) through react-dom, the language moves ONLY
 * through the config store's real reducer, and the props never change — the
 * memo is never handed a reason to re-render. Only boundaries Node cannot load
 * are replaced: react-native's primitives (recorded), the avatar pipeline
 * (`AgentListRow` forwards to the real `ListRow` without a picture), the tag
 * line (the ROW's announcement is what is asserted), and the connection
 * provider's `useLocaleFrame`, bound to this test's config store in the same way
 * `projects/__tests__/locale-frame-mounted.test.tsx` does.
 *
 * `askCount`/`todoCount` are not asserted here: `SessionRow` does not pass them
 * to the row today, so the conversation list never paints those chips. The
 * repaint mechanism is the row's, so it covers them the moment they are wired.
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
import type { SessionSummary } from "@/contracts";
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

/** Records every string prop (accessible names included) and string child it
 *  is handed, and renders element-valued props so nested copy is recorded. */
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

vi.mock("react-native", () => {
	class Value {
		constructor(public value: number) {}
		setValue(next: number): void {
			this.value = next;
		}
	}
	const animation = { start: () => undefined, stop: () => undefined };
	return {
		View: Recorder,
		Text: Recorder,
		Pressable: Recorder,
		ActivityIndicator: () => null,
		Animated: {
			View: Recorder,
			Value,
			loop: () => animation,
			sequence: () => animation,
			timing: () => animation,
		},
		Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
		PixelRatio: { getFontScale: () => 1 },
		useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
	};
});
vi.mock("lucide-react-native", () => ({ Check: () => null }));
vi.mock("@/ui/appearance", () => ({
	useTokenColor: () => "#000000",
	useReducedMotion: () => true,
}));
vi.mock("@/ui/text-scale-provider", () => ({
	useTextScale: () => ({ effectiveScale: 1 }),
}));
vi.mock("@/ui/components/shimmer", () => ({ Shimmer: () => null }));
vi.mock("@/features/sessions/tag-line", () => ({
	SessionTagLine: () => null,
}));
vi.mock("@/features/session/outbox", () => ({ useOutboxPhase: () => null }));
vi.mock("@/features/auth/connection-provider", () => ({
	useLocaleFrame: () => useStore(host.store, (state) => state.language),
}));
vi.mock("@/features/agent-avatar/agent-avatar-view", async () => {
	const { ListRow } = await import("@/ui/components/list-row");
	return {
		AgentListRow: ({
			avatarRef: _avatarRef,
			avatarTestID: _avatarTestID,
			reserveLeading: _reserveLeading,
			...props
		}: Record<string, unknown>) =>
			createElement(ListRow, props as Parameters<typeof ListRow>[0]),
	};
});

const SESSION = {
	session_id: "session-1",
	section: "active",
	pinned: false,
	conversation_name: "Payments",
	cwd: "/home/me/payments",
	model_label: "anthropic/claude-opus-5",
	streaming: false,
	needs_attention: false,
	unseen: true,
	pending_kind: "",
	leaving: "",
	updating: "",
	subagents_running: 3,
	subagents_queued: 0,
	todos_open: 0,
	mtime: 1_700_000_000,
	completion_kind: "",
	tags: [{ id: "t1", name: "work" }],
} as unknown as SessionSummary;

/** The keyed copy this row paints, with the arguments it paints it with. */
const COPY = [
	["mobile.sidebar.row.new", {}],
	["mobile.sidebar.row.agents", { count: 3 }],
	["mobile.sidebar.tags.announcement", { names: "work" }],
] as const;

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

/** Whether some recorded string carries `text` (the tag announcement is folded
 *  into the row's one accessible name, so it is a substring there). */
const painted = (text: string): boolean =>
	host.texts.some((recorded) => recorded.includes(text));

describe("a mounted conversation row repaints on a language frame", () => {
	it("follows fr → ur without a prop change or the minute tick", async () => {
		const { SessionRow } = await import("@/features/sessions/session-row");
		for (const [key, params] of COPY) {
			// Guard: a key whose fr and ur (or ur and English) render the same
			// could pass without any repaint.
			expect(renderFor(key, params, "fr")).not.toBe(
				renderFor(key, params, "ur"),
			);
			expect(renderFor(key, params, "ur")).not.toBe(
				renderFor(key, params, "en"),
			);
		}
		const onActivate = () => undefined;
		const onLongPress = () => undefined;
		frame("fr", 2);
		await act(async () =>
			root.render(
				createElement(SessionRow, {
					session: SESSION,
					section: "active",
					selected: false,
					now: 1_700_000_100,
					tagsAssignable: true,
					// Required prop; no row in this fixture list has a picture.
					reserveLeading: false,
					onActivate,
					onLongPress,
				}),
			),
		);
		for (const [key, params] of COPY) {
			expect(painted(renderFor(key, params, "fr"))).toBe(true);
		}

		host.texts = [];
		await act(async () => frame("ur", 3));
		for (const [key, params] of COPY) {
			expect(painted(renderFor(key, params, "ur"))).toBe(true);
			expect(painted(renderFor(key, params, "fr"))).toBe(false);
		}
	});
});

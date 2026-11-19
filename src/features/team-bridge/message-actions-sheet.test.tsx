/**
 * The Team Bridge message-actions sheet (spec "Mobile Team Bridge: reactions
 * and start-a-thread", slice PR a). Operator: "there's no way to react or post
 * in a thread on mobile team bridge".
 *
 * Pinned at the screen seam: the REAL `ThreadMessageRow` and the REAL
 * `useMessageActions` hook (sheet state, handoff, clipboard, toast, selection
 * request), with only the native boundaries stubbed — the modal `Sheet`
 * (rendered inline while visible, its `onDismiss` captured), the clipboard,
 * the haptic engine, icons, and the row's unrelated children (avatar, images,
 * delivery). `Pressable` and `Text` are react-native-web's, wrapped so the test
 * can read the props the native views would receive.
 */
import { readFileSync } from "node:fs";
import { act, createElement, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rec = vi.hoisted(() => ({
	os: "ios" as "ios" | "android" | "web",
	presses: new Map<string, Record<string, unknown>>(),
	texts: [] as Record<string, unknown>[],
	inputs: [] as Record<string, unknown>[],
	sheet: null as null | { onDismiss?: () => void; onClose: () => void },
	visible: false,
	clipboard: [] as string[],
	haptics: [] as string[],
}));

vi.mock("react-native", async (importOriginal) => {
	const rnw = (await importOriginal()) as Record<string, unknown>;
	const { createElement } = await import("react");
	return {
		...rnw,
		Platform: {
			...(rnw.Platform as object),
			get OS() {
				return rec.os;
			},
			select: (spec: Record<string, unknown>) => spec[rec.os] ?? spec.default,
		},
		Pressable: (props: {
			testID?: string;
			children?: ReactNode | ((s: { pressed: boolean }) => ReactNode);
		}) => {
			if (props.testID) rec.presses.set(props.testID, props);
			const content =
				typeof props.children === "function"
					? props.children({ pressed: false })
					: props.children;
			return createElement("div", { "data-testid": props.testID }, content);
		},
		Text: (props: { children?: ReactNode }) => {
			rec.texts.push(props);
			return createElement("span", null, props.children);
		},
		TextInput: (props: { value?: string }) => {
			rec.inputs.push(props);
			return createElement("textarea", null, props.value);
		},
	};
});
vi.mock("expo-clipboard", () => ({
	setStringAsync: async (value: string) => {
		rec.clipboard.push(value);
		return true;
	},
}));
vi.mock("@/lib/haptics", () => ({
	haptic: (kind: string) => rec.haptics.push(kind),
}));
/* Every icon the app imports, as a null component: SVG drawing is not what is
 *  pinned here, and the package's own entry is not loadable in Node. */
vi.mock("lucide-react-native", () =>
	Object.fromEntries(
		[
			"AlertTriangle",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUpRight",
			"AtSign",
			"Bell",
			"BellDot",
			"BellOff",
			"Bot",
			"CalendarClock",
			"Check",
			"CheckCheck",
			"ChevronDown",
			"ChevronLeft",
			"ChevronRight",
			"ChevronUp",
			"ChevronsUpDown",
			"CircleAlert",
			"CircleDot",
			"CircleSlash",
			"ClipboardPaste",
			"Clock",
			"Code",
			"Copy",
			"File",
			"FileAudio",
			"FileText",
			"Folder",
			"FolderKanban",
			"Hash",
			"History",
			"Hourglass",
			"Image",
			"ImagePlus",
			"Inbox",
			"Info",
			"Keyboard",
			"Laptop",
			"Library",
			"ListChecks",
			"Lock",
			"LockOpen",
			"Menu",
			"MessageSquare",
			"MessageSquareOff",
			"MessageSquareReply",
			"MessagesSquare",
			"Mic",
			"MoreHorizontal",
			"MoreVertical",
			"Music",
			"Paperclip",
			"Pause",
			"Pencil",
			"Play",
			"Plus",
			"Presentation",
			"RefreshCw",
			"RotateCw",
			"Search",
			"Server",
			"Settings",
			"SlidersHorizontal",
			"Square",
			"SquarePen",
			"Star",
			"Table",
			"TextCursor",
			"TriangleAlert",
			"UserRound",
			"Users",
			"Video",
			"X",
		].map((name) => [name, () => null]),
	),
);
vi.mock("@/ui/appearance", () => ({
	useTokenColor: () => "#137742",
	useReducedMotion: () => false,
}));
vi.mock("@/ui/components/sheet", () => ({
	Sheet: (props: {
		visible: boolean;
		children: ReactNode;
		testID?: string;
		onDismiss?: () => void;
		onClose: () => void;
	}) => {
		rec.sheet = props;
		rec.visible = props.visible;
		return props.visible
			? createElement(
					"section",
					{ "data-testid": props.testID },
					props.children,
				)
			: null;
	},
}));
vi.mock("./profile-card", () => ({
	ProfileAuthorName: () => null,
	ProfileAuthorPhoto: () => null,
	ProfileSheet: () => null,
	UnknownSenderAvatar: () => null,
}));
vi.mock("./attachment-views", () => ({
	MessageAttachments: () => null,
	ComposerAttachments: () => null,
}));
vi.mock("./message-delivery", () => ({ MessageDelivery: () => null }));
/* The rest of thread-screen's import graph that ships native or Flow source
 *  Node cannot load; none of it is on the path under test. */
vi.mock("expo-router", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	useLocalSearchParams: () => ({}),
	useFocusEffect: () => {},
	usePathname: () => "/",
	router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
	Link: () => null,
}));
vi.mock("expo-constants", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({
	randomUUID: () => "00000000-0000-4000-8000-000000000000",
	getRandomBytes: (n: number) => new Uint8Array(n),
}));
vi.mock("expo-web-browser", () => ({}));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("expo-glass-effect", () => ({
	GlassView: () => null,
	isGlassEffectAPIAvailable: () => false,
	isLiquidGlassAvailable: () => false,
}));
vi.mock("react-native-reanimated", () => ({
	__esModule: true,
	default: { View: () => null },
	useSharedValue: (value: number) => ({ value }),
	useAnimatedStyle: () => ({}),
	withTiming: (value: number) => value,
	Easing: { bezier: () => () => 0 },
}));
vi.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("react-native-svg", () => {
	const none = () => null;
	return {
		__esModule: true,
		default: none,
		Svg: none,
		Path: none,
		Rect: none,
		Circle: none,
		Defs: none,
		LinearGradient: none,
		Stop: none,
		G: none,
		Line: none,
		Text: none,
	};
});
vi.mock("uniwind", () => ({
	ScopedVariables: ({ children }: { children?: ReactNode }) => children ?? null,
	Uniwind: { setTheme: () => {}, updateCSSVariables: () => {} },
	useCSSVariable: () => undefined,
}));

const { installDomShim } = await import("@/testing/dom-shim");
const { resetLocaleSource, setLocaleSource } = await import("@/i18n/locale");
const { message: fixture, SELF } = await import(
	"@/team-bridge/__tests__/fixtures"
);
const { replyThreadPath } = await import("@/team-bridge/reply-threads");
const { useUiStore } = await import("@/state/ui-store");
const a11y = await import("@/ui/a11y");
const selection = await import("@/features/session/text-selection");
const sheetModule = await import("./message-actions-sheet");
const { ThreadMessageRow } = await import("./thread-screen");
type Message = import("@/team-bridge/contract").Message;

const ROOT = fixture(1, SELF, "2026-11-18T09:00:00Z", {
	body: "Ship **it** today",
});
const REPLY = fixture(2, SELF, "2026-11-18T09:01:00Z", {
	body: "on it",
	thread_root_id: ROOT.id,
});
const IMAGE_ONLY = fixture(3, SELF, "2026-11-18T09:02:00Z", { body: "" });

function Harness({
	message,
	scope = "timeline",
	canReplyInThread = true,
	onReplyInThread,
}: {
	message: Message;
	scope?: "timeline" | "reply";
	canReplyInThread?: boolean;
	onReplyInThread?: (rootId: string) => void;
}) {
	const actions = sheetModule.useMessageActions({
		scope,
		canReplyInThread,
		onReplyInThread,
	});
	const [hub] = useState(() => ({}) as never);
	return createElement(
		"main",
		null,
		createElement(ThreadMessageRow, {
			message,
			continuation: false,
			people: [],
			hub,
			tenantId: "ten_x",
			onOpenProfile: () => {},
			onDeliveryHelp: () => {},
			locale: "en",
			actions: actions.controller,
			actionsOpen: actions.openMessageId === message.id,
		}),
		actions.sheet,
	);
}

let dom: ReturnType<typeof installDomShim>;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
	rec.os = "ios";
	rec.presses.clear();
	rec.texts.length = 0;
	rec.inputs.length = 0;
	rec.sheet = null;
	rec.visible = false;
	rec.clipboard.length = 0;
	rec.haptics.length = 0;
	setLocaleSource(() => "en");
	useUiStore.setState({ toast: null });
	dom = installDomShim();
	root = createRoot(dom.container as Element);
});
afterEach(async () => {
	await act(async () => root.unmount());
	dom.dispose();
	resetLocaleSource();
	selection.exitTextSelection();
});

const render = (props: Parameters<typeof Harness>[0]) =>
	act(async () => root.render(createElement(Harness, props)));
const row = (m: Message) => rec.presses.get(a11y.teamBridgeMessageId(m.id));
/** A recorded handler, or a failed test naming the missing one. */
const handler = (props: Record<string, unknown> | undefined, name: string) => {
	const fn = props?.[name];
	if (typeof fn !== "function") throw new Error(`no ${name} recorded`);
	return fn as (...args: unknown[]) => void;
};
const longPress = (m: Message) => {
	const press = handler(row(m), "onLongPress");
	rec.presses.clear();
	return act(async () => press());
};
const sheetOpen = () => rec.visible;
const offered = () =>
	(["reply_in_thread", "copy_text", "select_text"] as const).filter((a) =>
		rec.presses.has(a11y.teamBridgeMessageActionId(a)),
	);
const choose = async (action: string) => {
	const press = rec.presses.get(a11y.teamBridgeMessageActionId(action));
	rec.presses.clear();
	await act(async () => handler(press, "onPress")());
};
/** iOS runs a choice only after the modal's native dismissal. */
const nativeDismiss = () => act(async () => rec.sheet?.onDismiss?.());
const leafActions = () =>
	rec.texts
		.map((t) => t.accessibilityActions as { name: string; label: string }[])
		.filter(Boolean)
		.at(-1);

describe("the action list (pure)", () => {
	it("root with text: Reply in thread, Copy text, Select text, in that order", () => {
		expect(
			sheetModule.messageActions(ROOT, { canReplyInThread: true }),
		).toEqual(["reply_in_thread", "copy_text", "select_text"]);
	});
	it("a reply never offers Reply in thread (threads are one level deep)", () => {
		expect(
			sheetModule.messageActions(REPLY, { canReplyInThread: true }),
		).toEqual(["copy_text", "select_text"]);
	});
	it("no text: nothing to copy or select; a null body is not a crash", () => {
		expect(
			sheetModule.messageActions(IMAGE_ONLY, { canReplyInThread: true }),
		).toEqual(["reply_in_thread"]);
		expect(
			sheetModule.messageActions(
				{ body: null as never, thread_root_id: undefined },
				{ canReplyInThread: false },
			),
		).toEqual([]);
	});
	it("compose asks the thread screen to focus its composer", () => {
		const target = { tenantId: "t", conversationId: "c", rootId: "r" };
		expect(replyThreadPath(target)).toBe("/team-bridge/t/c/thread/r");
		expect(replyThreadPath(target, { compose: true })).toBe(
			"/team-bridge/t/c/thread/r?compose=1",
		);
	});
});

describe("long-press opens the sheet (timeline row)", () => {
	it("opens with a light haptic, tints the row, offers all three actions", async () => {
		await render({ message: ROOT, onReplyInThread: vi.fn() });
		expect(sheetOpen()).toBe(false);
		expect(dom.container.innerHTML ?? "").not.toContain(
			a11y.SURFACE.teamBridgeMessageActionsTint,
		);
		await longPress(ROOT);
		expect(rec.haptics).toEqual(["light"]);
		expect(offered()).toEqual(["reply_in_thread", "copy_text", "select_text"]);
		expect(
			rec.presses.get(a11y.teamBridgeMessageActionId("reply_in_thread"))
				?.accessibilityLabel,
		).toBe("Reply in thread");
	});

	it("Reply in thread on a zero-reply root pushes after the native dismissal (iOS)", async () => {
		const onReplyInThread = vi.fn();
		await render({ message: ROOT, onReplyInThread });
		await longPress(ROOT);
		await choose("reply_in_thread");
		// Under a still-presented modal a push is swallowed: not yet.
		expect(onReplyInThread).not.toHaveBeenCalled();
		await nativeDismiss();
		expect(onReplyInThread).toHaveBeenCalledWith(ROOT.id);
		expect(sheetOpen()).toBe(false);
	});

	it("Android runs the choice at once (it never fires onDismiss)", async () => {
		rec.os = "android";
		const onReplyInThread = vi.fn();
		await render({ message: ROOT, onReplyInThread });
		await longPress(ROOT);
		await choose("reply_in_thread");
		expect(onReplyInThread).toHaveBeenCalledWith(ROOT.id);
	});

	it("Copy text puts the PLAIN text on the clipboard and confirms with a toast", async () => {
		await render({ message: ROOT, onReplyInThread: vi.fn() });
		await longPress(ROOT);
		await choose("copy_text");
		await nativeDismiss();
		expect(rec.clipboard).toEqual(["Ship it today"]);
		expect(useUiStore.getState().toast?.message).toBe("Copied");
	});

	it("Select text enters the existing selection mode (iOS)", async () => {
		await render({ message: ROOT, onReplyInThread: vi.fn() });
		expect(rec.inputs).toHaveLength(0);
		await longPress(ROOT);
		await choose("select_text");
		await nativeDismiss();
		expect(selection.activeTextSelection()).toBe(
			sheetModule.bridgeSelectionId("timeline", ROOT.id),
		);
		expect(rec.inputs.at(-1)).toMatchObject({
			value: "Ship it today",
			editable: false,
		});
	});

	it("Select text makes the message selectable (Android), not before", async () => {
		rec.os = "android";
		await render({ message: ROOT, onReplyInThread: vi.fn() });
		const bodyLeaf = () =>
			rec.texts.filter((t) => "selectable" in t).at(-1)?.selectable;
		expect(bodyLeaf()).toBe(false);
		await longPress(ROOT);
		await choose("select_text");
		expect(bodyLeaf()).toBe(true);
	});

	it("a read-only conversation does not offer Reply in thread", async () => {
		await render({
			message: ROOT,
			canReplyInThread: false,
			onReplyInThread: vi.fn(),
		});
		await longPress(ROOT);
		expect(offered()).toEqual(["copy_text", "select_text"]);
	});
});

describe("reply thread screen rows", () => {
	it("never offer Reply in thread, root or reply", async () => {
		for (const m of [ROOT, REPLY]) {
			rec.presses.clear();
			await render({ message: m, scope: "reply", canReplyInThread: false });
			await longPress(m);
			expect(offered()).toEqual(["copy_text", "select_text"]);
			await act(async () => rec.sheet?.onClose());
		}
	});
});

describe("screen readers reach every action without a long-press", () => {
	it("the body leaf carries the row's actions, and running one acts directly", async () => {
		const onReplyInThread = vi.fn();
		await render({ message: ROOT, onReplyInThread });
		expect(leafActions()).toEqual([
			{ name: "reply_in_thread", label: "Reply in thread" },
			{ name: "copy_text", label: "Copy text" },
			{ name: "select_text", label: "Select text" },
		]);
		const leaf = rec.texts.filter((t) => t.onAccessibilityAction).at(-1);
		await act(async () =>
			handler(
				leaf,
				"onAccessibilityAction",
			)({
				nativeEvent: { actionName: "reply_in_thread" },
			}),
		);
		expect(onReplyInThread).toHaveBeenCalledWith(ROOT.id);
		expect(sheetOpen()).toBe(false);
	});

	it("an image-only root carries Reply in thread on its timestamp", async () => {
		await render({ message: IMAGE_ONLY, onReplyInThread: vi.fn() });
		expect(leafActions()).toEqual([
			{ name: "reply_in_thread", label: "Reply in thread" },
		]);
	});

	it("the row container is not one accessibility element (links stay reachable)", async () => {
		await render({ message: ROOT, onReplyInThread: vi.fn() });
		expect(row(ROOT)?.accessible).toBe(false);
	});
});

const COMPOSE_PARAM_WIRED =
	/compose=\{single\(params\[REPLY_THREAD_COMPOSE_PARAM\]\) === "1"\}/;
const AUTOFOCUS_COMPOSE = /autoFocus=\{compose\}/;
const SHEET_COMPOSES =
	/replyThreadPath\(\s*\{ tenantId, conversationId, rootId \},\s*\{ compose: true \},?\s*\)/;
const FIELD_AUTOFOCUS = /onFocus=\{onFocus\}\s*autoFocus=\{autoFocus\}/;
/* "Reply in thread" lands with the composer focused. The reply screen's
 *  provider/store graph is not renderable here, so its wiring is pinned in
 *  source, the convention of `selectable-wiring.test.ts`. */
describe("the reply thread focuses its composer when opened to compose", () => {
	const source = (file: string) =>
		readFileSync(new URL(file, import.meta.url), "utf8");
	it("reads the compose param and hands it to the composer as autoFocus", () => {
		const screen = source("./reply-thread-screen.tsx");
		expect(screen).toMatch(COMPOSE_PARAM_WIRED);
		expect(screen).toMatch(AUTOFOCUS_COMPOSE);
		// Only the sheet's entry composes; the chip opens the thread to read.
		expect(source("./thread-screen.tsx")).toMatch(SHEET_COMPOSES);
	});
	it("the composer field passes autoFocus through to its input", () => {
		expect(source("./thread-chrome.tsx")).toMatch(FIELD_AUTOFOCUS);
	});
});

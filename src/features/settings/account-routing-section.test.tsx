import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { renderFor, resetLocaleSource, setLocaleSource } from "@/i18n";
import { type DomShim, installDomShim } from "@/testing/dom-shim";
import {
	ACCOUNT_ROUTING_COPY,
	type AccountRoutingCopyKey,
} from "./account-routing-copy";
import type { AccountRoutingState } from "./account-routing-state";

/**
 * The Account routing section, MOUNTED in a non-English locale (M3 S5).
 *
 * The section used to render through `accountRoutingCopy()`, which returns the
 * English SOURCE table that exists for the plain-`node` native proof, so an
 * Urdu or French reader saw "ACCOUNT ROUTING" / "Changes apply only to this
 * computer." in English even though all eight catalogues carry the keys. A
 * source-table test cannot see that (the table is English on purpose), so this
 * renders the real section through every state that shows chrome copy and
 * asserts what a reader sees: the catalogue value for the active locale, and
 * never the English source where the catalogue says something else.
 *
 * Only leaf primitives and the connection/editor seams are stubbed: Node has no
 * React Native host, and the editor's async transport is covered by
 * `account-routing-state.test.ts`. Backend label/help/choice/error TEXT is
 * passed through untouched and deliberately excluded from the assertions.
 */
const host = vi.hoisted(() => ({
	connection: {
		relay: () => ({}) as object,
		streamHealth: "live" as string,
	},
	state: {
		phase: "live" as string,
		route: { mode: "direct" } as object | null,
	},
	editor: null as null | {
		store: StoreApi<AccountRoutingState>;
	},
	texts: [] as string[],
}));
/* The config stream's language frame, stubbed as a store so a test can move it
 * while the section is mounted (the real one is `configStore`). */
const frame = createStore<{ language: string | null }>(() => ({
	language: null,
}));

vi.mock("react-native", () => ({
	View: ({ children }: { children?: ReactNode }) => children ?? null,
	Text: ({ children }: { children?: ReactNode }) => {
		if (typeof children === "string") host.texts.push(children);
		return children ?? null;
	},
}));
vi.mock("@/features/auth/connection-provider", () => ({
	useConnection: () => host.connection,
	useConnectionState: <T,>(select: (state: typeof host.state) => T) =>
		select(host.state),
	useLocaleFrame: () => useStore(frame, (state) => state.language),
}));
vi.mock("@/ui/components/button", () => ({
	Button: ({ label }: { label: string }) => {
		host.texts.push(label);
		return null;
	},
}));
vi.mock("@/ui/components/section-header", () => ({
	SectionHeader: ({ label }: { label: string }) => {
		host.texts.push(label);
		return null;
	},
}));
vi.mock("@/ui/components/segmented", () => ({ Segmented: () => null }));
vi.mock("./account-routing-state", () => ({
	createAccountRoutingEditor: () => {
		const store = (host.editor as NonNullable<typeof host.editor>).store;
		return Object.assign(store, {
			activate: async () => undefined,
			deactivate: () => undefined,
			reload: async () => undefined,
			choose: () => undefined,
			savePolicy: async () => undefined,
		});
	},
}));

const { AccountRoutingSection } = await import("./account-routing-section");

const READY: AccountRoutingState["read"] = {
	kind: "ready",
	payload: {
		setting: {
			label: "backend label",
			help: "backend help",
			value: "a",
			choices: [
				{ value: "a", label: "A", description: "backend a" },
				{ value: "b", label: "B", description: "backend b" },
			],
		},
	} as never,
};

/** Each state that puts chrome copy on screen, with the keys it must show.
 *  Together they cover all 14 keys, so a new key rendered off the table again
 *  would surface here. */
type StateCase = {
	name: string;
	connected: boolean;
	state?: AccountRoutingState;
	keys: AccountRoutingCopyKey[];
};
const DISCONNECTED: StateCase = {
	name: "disconnected",
	connected: false,
	keys: [
		"mobile.account_routing.title",
		"mobile.account_routing.scope",
		"mobile.account_routing.disconnected",
	],
};
const STATES: StateCase[] = [
	DISCONNECTED,
	{
		name: "loading",
		connected: true,
		state: {
			read: { kind: "loading" },
			draft: "",
			save: "idle",
			saveError: null,
		},
		keys: ["mobile.account_routing.loading"],
	},
	{
		name: "unsupported",
		connected: true,
		state: {
			read: { kind: "unsupported", serverText: null },
			draft: "",
			save: "idle",
			saveError: null,
		},
		keys: [
			"mobile.account_routing.unavailable",
			"mobile.account_routing.retry",
		],
	},
	{
		name: "load error",
		connected: true,
		state: {
			read: { kind: "error", serverText: null },
			draft: "",
			save: "idle",
			saveError: null,
		},
		keys: ["mobile.account_routing.load_error"],
	},
	{
		name: "unsaved draft",
		connected: true,
		state: { read: READY, draft: "b", save: "idle", saveError: null },
		keys: ["mobile.account_routing.save", "mobile.account_routing.unsaved"],
	},
	{
		name: "saving",
		connected: true,
		state: { read: READY, draft: "b", save: "pending", saveError: null },
		keys: ["mobile.account_routing.saving"],
	},
	{
		name: "saved",
		connected: true,
		state: { read: READY, draft: "a", save: "saved", saveError: null },
		keys: ["mobile.account_routing.saved"],
	},
	{
		name: "unconfirmed save",
		connected: true,
		state: { read: READY, draft: "b", save: "error", saveError: null },
		keys: ["mobile.account_routing.error", "mobile.account_routing.reload"],
	},
	{
		name: "rejected save",
		connected: true,
		state: { read: READY, draft: "b", save: "rejected", saveError: null },
		keys: ["mobile.account_routing.rejected"],
	},
];

let dom: DomShim;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
	dom = installDomShim();
	root = createRoot(dom.container as Element);
});
afterEach(async () => {
	await act(async () => root.unmount());
	dom.dispose();
	resetLocaleSource();
	frame.setState({ language: null });
});

async function renderState(entry: StateCase): Promise<string[]> {
	host.state.phase = entry.connected ? "live" : "idle";
	host.state.route = entry.connected ? { mode: "direct" } : null;
	host.editor = entry.state
		? { store: createStore<AccountRoutingState>(() => entry.state as never) }
		: null;
	host.texts = [];
	// A fresh root per state: the editor model is memoised per client, so a
	// re-render alone would keep the previous state's store.
	await act(async () => root.unmount());
	root = createRoot(dom.container as Element);
	await act(async () => root.render(<AccountRoutingSection />));
	return [...host.texts];
}

describe("AccountRoutingSection renders the active catalogue", () => {
	it("covers every account-routing key across its states", () => {
		const covered = new Set(STATES.flatMap((entry) => entry.keys));
		expect([...covered].sort()).toEqual(
			Object.keys(ACCOUNT_ROUTING_COPY).sort(),
		);
	});

	for (const locale of ["ur", "fr"] as const) {
		for (const entry of STATES) {
			it(`${locale}: ${entry.name} shows catalogue copy, not the English source`, async () => {
				setLocaleSource(() => locale);
				const texts = await renderState(entry);
				for (const key of entry.keys) {
					const localized = renderFor(key, {}, locale);
					const english = ACCOUNT_ROUTING_COPY[key].source;
					expect(texts).toContain(localized);
					// Only meaningful where the translation differs; an identical
					// string (none today) would be a translator's choice, not a leak.
					if (localized !== english) expect(texts).not.toContain(english);
				}
			});
		}
	}

	it("repaints in the new language when the frame switches while mounted", async () => {
		setLocaleSource(() => frame.getState().language);
		frame.setState({ language: "en" });
		await renderState(DISCONNECTED);
		const scope = "mobile.account_routing.scope" as const;
		expect(host.texts).toContain(ACCOUNT_ROUTING_COPY[scope].source);
		host.texts = [];
		// Nothing but the language moves: no connection or editor state changes.
		await act(async () => frame.setState({ language: "ur" }));
		expect(host.texts).toContain(renderFor(scope, {}, "ur"));
		expect(host.texts).not.toContain(ACCOUNT_ROUTING_COPY[scope].source);
	});

	it("en still renders the English source (the native proof's oracle)", async () => {
		setLocaleSource(() => "en");
		const texts = await renderState(DISCONNECTED);
		expect(texts).toContain(
			ACCOUNT_ROUTING_COPY["mobile.account_routing.scope"].source,
		);
	});
});

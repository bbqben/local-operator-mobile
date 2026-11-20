import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { type TranscriptEntry, transcriptEntrySchema } from "@/contracts";

/**
 * The inbound Team Bridge card (local-operator #4238): rendered through the
 * real row: the old-relay path keeps the receipt text and gains no body region
 * (asserted by content, not a byte comparison with a pre-change render), and
 * the new path renders the body region. The Node host is the server renderer (no
 * effects run), so the fetching shell is asserted in its loading frame and each
 * resolved state through `BridgeCardBodyLines`. Mocks follow
 * `transcript-row-blank.test.tsx`.
 */
vi.mock("react-native", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-native")>();
	const { createElement } = await import("react");
	type HostProps = {
		children?: import("react").ReactNode;
		className?: string;
		testID?: string;
	};
	const host =
		(tag: string) =>
		({ children, className, testID }: HostProps) =>
			createElement(
				tag,
				{ "data-class": className, "data-testid": testID },
				children,
			);
	return {
		...actual,
		View: host("div"),
		Text: host("span"),
		Pressable: host("div"),
		ScrollView: host("div"),
	};
});

vi.mock("@/ui/appearance", () => ({
	useReducedMotion: () => false,
	useTheme: () => ({ active: "light" }),
	useTokenColor: (role: string) => `token:${role}`,
}));

vi.mock("@/ui/text-scale-provider", () => ({
	useTextScale: () => ({ effectiveScale: 1 }),
}));

/* The prose arm's renderer pulls native modules the Node host cannot load; a
 * marker stands in so the test can tell the prose arm from the blank one. */
vi.mock("@/features/session/components/markdown", async () => {
	const { createElement } = await import("react");
	return {
		Markdown: ({ text }: { text: string }) =>
			createElement("p", { "data-md": "" }, text),
	};
});

/* Arms this file never renders, whose imports reach `expo` (no `__DEV__` in
 * Node): stubbed so the row module loads; the blank and prose arms are real. */
vi.mock("@/features/session/components/imagegen-card", () => ({
	ImageGenCard: () => null,
}));
vi.mock("@/features/session/components/transcript-image", () => ({
	TranscriptImage: () => null,
}));
vi.mock("@/features/session/components/tool-row", () => ({
	ToolRow: () => null,
}));
/* Integration of #234 with #235: the row now imports the user arm's
 * Show-more clamp, whose `react-native-svg` fade the Node host cannot load
 * (the suite failed to import with "SyntaxError: Unexpected token 'typeof'").
 * This file never renders the user arm, so it is stubbed like the arms above. */
vi.mock("@/features/session/components/user-message-clamp", () => ({
	UserMessageClamp: () => null,
}));

vi.mock("@/ui/components/button", () => ({
	Button: ({ label }: { label: string }) =>
		createElement("button", { type: "button" }, label),
}));

import { BridgeCardBodyLines, BridgeCardBodyRegion } from "./bridge-card-body";
import { TranscriptRow } from "./transcript-row";

const receipt = (): TranscriptEntry => ({
	id: "e-bridge-1",
	kind: "notice",
	text: "Ada · #release",
	custom_type: "team_bridge_message",
	tool_call_id: "",
	tool_name: "",
	tool_state: "done",
	summary: "",
	intent: "",
	diff_added: 0,
	diff_removed: 0,
	elapsed_s: 0,
	error: "",
	details: {
		bridge_receipt: {
			v: 1,
			sender: { name: "Ada" },
			conversation: { kind: "channel", label: "release" },
		},
	},
	images: [],
	final: true,
	text_complete: true,
});

const lines = (view: Parameters<typeof BridgeCardBodyLines>[0]["view"]) =>
	renderToStaticMarkup(createElement(BridgeCardBodyLines, { view }));

describe("inbound Team Bridge card", () => {
	it("keeps today's receipt row when the relay does not serve bodies", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptRow, { entry: receipt() }),
		);
		expect(markup).toContain("Ada · #release");
		expect(markup).not.toContain("bridge-body");
		expect(markup).not.toContain("Loading message");
	});

	it("paints the live peer_message echo as the same card when bodies are served (QA Q2)", () => {
		// The exact row `note_peer_message` emits for a live card when the owner
		// has not negotiated peer_cycles: kind peer_message, text = the
		// model-facing METADATA card, the typed marks only on the sender
		// (`deliver_wake`: account_id, source, name, validated receipt).
		// Untyped on purpose: this is the WIRE row, extra sender keys included.
		const live = {
			...receipt(),
			id: "peer-f4c46524ac674537a2b37cc766690742",
			kind: "peer_message",
			custom_type: undefined,
			text: "<team-bridge>\nDirect message · from Ola (human, same tenant)\nmessage_id: bcmsg_live0001",
			details: {
				sender: {
					account_id: "acc_local_1",
					source: "team_bridge_message",
					name: "Ola",
					bridge_receipt: {
						v: 1,
						sender: { name: "Ola", kind: "human" },
						conversation: { kind: "dm" },
					},
				},
			},
		};
		const parsed = transcriptEntrySchema.parse(live);
		const load = vi.fn(async () => null);
		const markup = renderToStaticMarkup(
			createElement(TranscriptRow, { entry: parsed, loadBridgeBody: load }),
		);
		expect(markup).toContain("Ola · DM");
		expect(markup).toContain("Loading message…");
		expect(markup).toContain("-bridge-body");
		expect(markup).not.toContain("another session");
		// The metadata card (ids, envelope) is never painted on the card.
		expect(markup).not.toContain("bcmsg_live0001");
		expect(markup).not.toContain("&lt;team-bridge&gt;");

		// An old relay: the echo stays the peer row it always was.
		const old = renderToStaticMarkup(
			createElement(TranscriptRow, { entry: parsed }),
		);
		expect(old).not.toContain("-bridge-body");
		expect(old).not.toContain("Ola · DM");
	});

	it("paints the live notice arm (custom_kind only) as the card", () => {
		const notice = {
			...receipt(),
			id: "peer-0001",
			custom_type: undefined,
			details: {
				notice_kind: "cross_session_boundary",
				custom_kind: "team_bridge_message",
				sender: { account_id: "acc_local_1", source: "team_bridge_message" },
				bridge_receipt: {
					v: 1,
					sender: { name: "Ada" },
					conversation: { kind: "dm" },
				},
			},
		};
		const markup = renderToStaticMarkup(
			createElement(TranscriptRow, {
				entry: transcriptEntrySchema.parse(notice),
				loadBridgeBody: async () => null,
			}),
		);
		expect(markup).toContain("Ada · DM");
		expect(markup).toContain("-bridge-body");
	});

	it("never treats an ordinary peer message as a card", () => {
		const peer: TranscriptEntry = {
			...receipt(),
			id: "peer-plain",
			kind: "peer_message",
			custom_type: undefined,
			text: "hello from a session",
			details: {
				sender: { session_id: "abcdef012345", conversation_name: "Planner" },
			},
		};
		const markup = renderToStaticMarkup(
			createElement(TranscriptRow, {
				entry: peer,
				loadBridgeBody: async () => null,
			}),
		);
		expect(markup).not.toContain("-bridge-body");
		expect(markup).toContain("Planner");
	});

	it("asks for the body of THIS row and shows loading until it answers", () => {
		const load = vi.fn(async () => null);
		const markup = renderToStaticMarkup(
			createElement(TranscriptRow, { entry: receipt(), loadBridgeBody: load }),
		);
		expect(markup).toContain("Ada · #release");
		expect(markup).toContain("Loading message…");
		expect(markup).toContain("-bridge-body");
		// The receipt text is the caption's own words; it is not painted twice.
		expect(markup.match(/Ada · #release/g)).toHaveLength(1);
	});

	it("renders an admitted body as markdown under the untrusted framing", () => {
		const markup = lines({
			lines: [{ kind: "body", markdown: "**ship it**" }],
			more: 0,
		});
		expect(markup).toContain("External message · untrusted content");
		expect(markup).toContain('data-md=""');
		expect(markup).toContain("**ship it**");
		// The untrusted rail is the control edge, not the blockquote hairline (D3).
		expect(markup).toContain("border-border-control");
		expect(markup.indexOf("untrusted content")).toBeLessThan(
			markup.indexOf("ship it"),
		);
	});

	it.each([
		["held", "Held by moderation."],
		["held_transient", "Waiting for screening — not shown to your agent yet."],
		["refused", "Refused by moderation."],
		["pending", "Waiting to be delivered to your agent."],
		["deleted", "This message was deleted."],
		["offline", "Couldn't reach Radient — reopen the conversation to retry."],
		["unavailable", "Message body unavailable."],
	] as const)("says %s in words, with no untrusted framing", (state, copy) => {
		const markup = lines({ lines: [{ kind: "state", state }], more: 0 });
		expect(markup).toContain(copy.replace("'", "&#x27;"));
		expect(markup).not.toContain("untrusted content");
		expect(markup).not.toContain('data-md=""');
	});

	it("counts the messages the relay did not itemise", () => {
		const markup = lines({
			lines: [{ kind: "state", state: "pending" }],
			more: 2,
		});
		expect(markup).toContain("2 more messages in this card");
	});

	it("the fetching shell starts in its loading frame", () => {
		const markup = renderToStaticMarkup(
			createElement(BridgeCardBodyRegion, {
				entryId: "e-bridge-1",
				load: async () => null,
			}),
		);
		expect(markup).toContain("Loading message…");
	});
});

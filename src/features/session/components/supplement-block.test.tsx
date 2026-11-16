import { readFileSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomShim } from "@/testing/dom-shim";
import { beatFromWire } from "../supplements";

const host = vi.hoisted(() => ({
	presses: new Map<string, () => void>(),
	source: vi.fn(async () => "blob:synthetic-sound"),
	revoke: vi.fn(),
}));
vi.mock("react-native", () => ({
	View: ({ children }: { children: import("react").ReactNode }) => children,
	Text: ({ children }: { children: import("react").ReactNode }) => children,
	ScrollView: ({ children }: { children: import("react").ReactNode }) =>
		children,
	Pressable: ({
		children,
		testID,
		onPress,
	}: {
		children: import("react").ReactNode;
		testID?: string;
		onPress: () => void;
	}) => {
		if (testID) host.presses.set(testID, onPress);
		return children;
	},
	Image: () => null,
	useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("expo-audio", () => ({
	useAudioPlayer: () => ({ play: vi.fn(), pause: vi.fn() }),
	useAudioPlayerStatus: () => ({ duration: 8 }),
}));
vi.mock("expo-video", () => ({
	useVideoPlayer: vi.fn(),
	VideoView: () => null,
}));
vi.mock("lucide-react-native", () => ({ Pause: () => null, Play: () => null }));
vi.mock("@/features/session/components/supplement-webview", () => ({
	SupplementWebView: () => null,
}));
vi.mock("@/features/session/runtime", () => ({
	playableSource: host.source,
	audioExtension: () => "wav",
	videoExtension: () => "mp4",
	toBase64: () => "",
}));
vi.mock("@/ui/appearance", () => ({ useTokenColor: () => "#000000" }));
vi.mock("@/ui/components", () => ({ Input: () => null, Shimmer: () => null }));
const { SupplementBlock } = await import("./supplement-block");
const { CONTROL } = await import("@/ui/a11y");

let dom: ReturnType<typeof installDomShim>;
let root: ReturnType<typeof createRoot>;
let unmounted: boolean;
beforeEach(() => {
	dom = installDomShim();
	root = createRoot(dom.container as never);
	unmounted = false;
	host.presses.clear();
	host.source.mockReset().mockResolvedValue("blob:synthetic-sound");
	host.revoke.mockReset();
	vi.stubGlobal(
		"URL",
		class extends URL {
			static override revokeObjectURL = host.revoke;
		},
	);
});
afterEach(async () => {
	if (!unmounted) await act(async () => root.unmount());
	vi.unstubAllGlobals();
	dom.dispose();
});
const fixture = (name: string) => {
	const row = JSON.parse(
		readFileSync(`fixtures/supplements/rows/${name}.json`, "utf8"),
	);
	const beat = beatFromWire({
		...row.payload.details,
		components: [],
		files: [],
		files_more: 0,
		sounds: [
			{
				attachment: "0123456789abcdef0123456789abcdef",
				mime: "audio/wav",
				title: "Generated chime",
				duration_s: 8,
			},
		],
	});
	if (!beat) throw new Error("fixture failed parsing");
	return beat;
};
const client = () => ({
	loadDocument: vi.fn(async () => ""),
	loadFile: vi.fn(async () => ({
		bytes: new Uint8Array(),
		mimeType: "text/plain",
	})),
	loadSound: vi.fn(async (_digest: string, _signal?: AbortSignal) => ({
		bytes: new Uint8Array([1]),
		mimeType: "audio/wav",
	})),
	command: vi.fn(async () => undefined),
});

describe("remote Highlight block lifecycle", () => {
	it("keeps previews but withholds unsupported remote mutations, leaving local controls unchanged", async () => {
		const remote = { ...client(), allowsCommand: () => false };
		await act(async () =>
			root.render(
				createElement(SupplementBlock, {
					beat: fixture("queued_no_files"),
					jobLive: true,
					client: remote,
				}),
			),
		);
		expect(host.presses.has(CONTROL.supplementCancel)).toBe(false);
		expect(host.presses.has(CONTROL.supplementAdjust)).toBe(false);
		host.presses.clear();
		await act(async () =>
			root.render(
				createElement(SupplementBlock, {
					beat: fixture("queued_no_files"),
					jobLive: true,
					client: client(),
				}),
			),
		);
		expect(host.presses.has(CONTROL.supplementCancel)).toBe(true);
		expect(host.presses.has(CONTROL.supplementAdjust)).toBe(true);
	});
	it("aborts a scrolled-away sound and does not turn late bytes into a playable source", async () => {
		const c = client();
		let finish!: (value: {
			bytes: Uint8Array<ArrayBuffer>;
			mimeType: string;
		}) => void;
		c.loadSound.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		await act(async () =>
			root.render(
				createElement(SupplementBlock, {
					beat: fixture("done_files_only"),
					jobLive: false,
					client: c,
				}),
			),
		);
		const press = host.presses.get(CONTROL.supplementSoundToggle);
		expect(press).toBeDefined();
		await act(async () => {
			press?.();
		});
		const signal = c.loadSound.mock.calls[0]?.[1];
		expect(signal?.aborted).toBe(false);
		await act(async () => root.unmount());
		unmounted = true;
		expect(signal?.aborted).toBe(true);
		await act(async () => {
			finish({ bytes: new Uint8Array([1, 2]), mimeType: "audio/wav" });
		});
		expect(host.source).not.toHaveBeenCalled();
	});
});

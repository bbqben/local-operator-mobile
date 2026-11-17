/**
 * `startRecording` on an iOS host, against a stand-in for `expo-audio` that
 * enforces the native audio-mode rules.
 *
 * Why a separate file: `react-native` resolves to `react-native-web` in this Node
 * host (`recorder.test.ts`), so `Platform.OS` is `web` and `startRecording` never
 * leaves its first guard. Here `Platform.OS` is `ios` and the module is a fake, in
 * a fresh module registry so `loadRecorder()`'s cached import is this file's own.
 *
 * The fake exists for ONE rule. expo-audio's iOS `AudioUtils.validateAudioMode`
 * (node_modules/expo-audio/ios/AudioUtils.swift, "playsInSilentMode == false and
 * allowsRecording == true cannot be set on iOS") throws for
 * `setAudioModeAsync({ allowsRecording: true })`, because `playsInSilentMode`
 * defaults to false. `startRecording` swallows every failure into `null`, so on a
 * device that throw read as "the microphone did not open" right after the reader
 * granted access. A fake that accepts any mode — which is what a plain mock does —
 * cannot see it. This one is a transcription of the native check, not a proof of
 * it: the real session needs a device build (named as a QA gap in the PR).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface AudioModeInput {
	allowsRecording?: boolean;
	playsInSilentMode?: boolean;
}

const calls = vi.hoisted(() => ({
	modes: [] as unknown[],
	recorded: 0,
}));

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("expo-audio", () => ({
	getRecordingPermissionsAsync: async () => ({ status: "granted" }),
	setAudioModeAsync: async (mode: AudioModeInput) => {
		calls.modes.push(mode);
		/* Mirrors AudioUtils.validateAudioMode on iOS; `Record` defaults are false. */
		if (mode.allowsRecording === true && mode.playsInSilentMode !== true) {
			throw new Error(
				"playsInSilentMode == false and allowsRecording == true cannot be set on iOS",
			);
		}
	},
	RecordingPresets: { HIGH_QUALITY: {} },
	AudioModule: {
		AudioRecorder: class {
			uri: string | null = "file:///tmp/take.m4a";
			prepareToRecordAsync = async () => undefined;
			record = () => {
				calls.recorded += 1;
			};
			stop = async () => undefined;
			getStatus = () => ({ durationMillis: 0, metering: undefined });
		},
	},
}));

describe("startRecording on iOS", () => {
	beforeEach(() => {
		calls.modes.length = 0;
		calls.recorded = 0;
	});

	it("sets an audio mode iOS accepts, and records", async () => {
		const { startRecording } = await import("@/stt/recorder");
		const active = await startRecording({ permission: "granted" });
		expect(calls.modes).toEqual([
			{ allowsRecording: true, playsInSilentMode: true },
		]);
		expect(active).not.toBeNull();
		expect(calls.recorded).toBe(1);
	});

	it("opens nothing when the permission was not granted", async () => {
		const { startRecording } = await import("@/stt/recorder");
		expect(await startRecording({ permission: "denied" })).toBeNull();
		expect(calls.modes).toEqual([]);
		expect(calls.recorded).toBe(0);
	});
});

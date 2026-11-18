/**
 * `startRecording` on a native host, against a stand-in for `expo-audio` that
 * enforces the native audio-mode rules and records what the native
 * `AudioRecorder` constructor is handed.
 *
 * Why a separate file: `react-native` resolves to `react-native-web` in this Node
 * host (`recorder.test.ts`), so `Platform.OS` is `web` and `startRecording` never
 * leaves its first guard. Here `Platform.OS` is a mutable fake starting at `ios`,
 * in a fresh module registry so `loadRecorder()`'s cached import is this file's
 * own.
 *
 * The fake exists for TWO rules. expo-audio's iOS `AudioUtils.validateAudioMode`
 * (node_modules/expo-audio/ios/AudioUtils.swift, "playsInSilentMode == false and
 * allowsRecording == true cannot be set on iOS") throws for
 * `setAudioModeAsync({ allowsRecording: true })`, because `playsInSilentMode`
 * defaults to false. `startRecording` swallows every failure into `null`, so on a
 * device that throw read as the "Couldn’t start recording" line right after the reader
 * granted access. A fake that accepts any mode — which is what a plain mock does —
 * cannot see it. The second rule is the OPTION SHAPE: the native recorders read
 * their top-level keys, not a nested platform object (ios/AudioRecords.swift,
 * android/…/AudioRecords.kt), so the preset's platform block must arrive spread
 * flat or iOS records uncompressed PCM.
 *
 * Both fakes are transcriptions of the native check and of the shipped preset, not
 * proof of either: the real session needs a device build (named as a QA gap in
 * the PR).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface AudioModeInput {
	allowsRecording?: boolean;
	playsInSilentMode?: boolean;
}

/** Mutable so the Android case can drive the platform switch; the module reads it
 *  at call time, the way the real `Platform.OS` behaves. */
const platform = vi.hoisted(() => ({ OS: "ios" as string }));

const calls = vi.hoisted(() => ({
	modes: [] as unknown[],
	options: [] as unknown[],
	recorded: 0,
}));

vi.mock("react-native", () => ({ Platform: platform }));

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
	/* `HIGH_QUALITY` copied from build/RecordingConstants.js. The platform blocks
	 * are the only place `outputFormat`/`audioQuality` live, which is why spreading
	 * the whole preset at the native constructor loses them. */
	RecordingPresets: {
		HIGH_QUALITY: {
			extension: ".m4a",
			sampleRate: 44100,
			numberOfChannels: 2,
			bitRate: 128000,
			android: { outputFormat: "mpeg4", audioEncoder: "aac" },
			ios: {
				outputFormat: "aac ",
				audioQuality: 127,
				linearPCMBitDepth: 16,
				linearPCMIsBigEndian: false,
				linearPCMIsFloat: false,
			},
			web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
		},
	},
	AudioModule: {
		AudioRecorder: class {
			constructor(options: unknown) {
				calls.options.push(options);
			}
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
		platform.OS = "ios";
		calls.modes.length = 0;
		calls.options.length = 0;
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

	it("hands the recorder FLAT options, so iOS picks AAC", async () => {
		const { startRecording } = await import("@/stt/recorder");
		await startRecording({ permission: "granted" });
		expect(calls.options).toEqual([
			{
				extension: ".m4a",
				sampleRate: 44100,
				numberOfChannels: 2,
				bitRate: 128000,
				isMeteringEnabled: true,
				outputFormat: "aac ",
				audioQuality: 127,
				linearPCMBitDepth: 16,
				linearPCMIsBigEndian: false,
				linearPCMIsFloat: false,
			},
		]);
	});

	it("opens nothing when the permission was not granted", async () => {
		const { startRecording } = await import("@/stt/recorder");
		expect(await startRecording({ permission: "denied" })).toBeNull();
		expect(calls.modes).toEqual([]);
		expect(calls.recorded).toBe(0);
	});
});

describe("startRecording on Android", () => {
	beforeEach(() => {
		platform.OS = "android";
		calls.modes.length = 0;
		calls.options.length = 0;
		calls.recorded = 0;
	});

	it("hands the recorder FLAT Android options", async () => {
		const { startRecording } = await import("@/stt/recorder");
		const active = await startRecording({ permission: "granted" });
		expect(calls.options).toEqual([
			{
				extension: ".m4a",
				sampleRate: 44100,
				numberOfChannels: 2,
				bitRate: 128000,
				isMeteringEnabled: true,
				outputFormat: "mpeg4",
				audioEncoder: "aac",
			},
		]);
		expect(active).not.toBeNull();
		expect(calls.recorded).toBe(1);
	});
});

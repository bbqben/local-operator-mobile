import { describe, expect, it } from "vitest";

import { hydrateWhenAvailable } from "./hydrate-when-available";
import {
	createPreferenceStore,
	filePreferenceBackend,
	type PreferenceBackend,
	type PreferenceFileSystem,
} from "./preference-store";
import {
	DEFAULT_SELECTION,
	parseSelection,
	serializeSelectionOver,
	THEME_SELECTION_KEY,
} from "./theme-preference";

/**
 * Settings survive an update, a locked relaunch and a re-sign-in (operator
 * report, 2026-11-16: "sometimes I lose my theme settings").
 */

const memory = (seed: Record<string, string> = {}) => {
	const data = new Map(Object.entries(seed));
	const backend: PreferenceBackend = {
		get: async (key) => data.get(key) ?? null,
		set: async (key, value) => {
			data.set(key, value);
		},
	};
	return { data, backend };
};

const CHOSEN = JSON.stringify({
	v: 1,
	mode: "dark",
	lightTheme: "localOperatorLight",
	darkTheme: "dracula",
});

describe("the preference store", () => {
	it("adopts a theme an earlier build left in the sealed device family", async () => {
		const primary = memory();
		const legacy = memory({ [THEME_SELECTION_KEY]: CHOSEN });
		const store = createPreferenceStore({
			primary: primary.backend,
			legacy: legacy.backend,
		});

		expect(await store.get(THEME_SELECTION_KEY)).toBe(CHOSEN);
		expect(primary.data.get(THEME_SELECTION_KEY)).toBe(CHOSEN);

		// Every interactive sign-in purges the sealed family whole
		// (`clearAuthorizationData`). The theme no longer depends on it.
		legacy.data.clear();
		expect(await store.get(THEME_SELECTION_KEY)).toBe(CHOSEN);
	});

	it("reports a legacy read that FAILED as a failure, never as nothing stored", async () => {
		const store = createPreferenceStore({
			primary: memory().backend,
			legacy: {
				get: () =>
					Promise.reject(new Error("private storage failed: installation")),
			},
		});
		await expect(store.get(THEME_SELECTION_KEY)).rejects.toThrow();
	});
});

describe("the file backend", () => {
	/** A minimal in-memory model of the expo-file-system SDK 57 classes used. */
	function fakeFs() {
		const files = new Map<string, string>();
		const dirs = new Set<string>();
		const pathOf = (parts: unknown[]) =>
			parts
				.map((part) =>
					typeof part === "string" ? part : (part as { path: string }).path,
				)
				.join("/");
		class Directory {
			path: string;
			constructor(...parts: unknown[]) {
				this.path = pathOf(parts);
			}
			info() {
				return { exists: dirs.has(this.path) };
			}
			create() {
				dirs.add(this.path);
			}
		}
		class File {
			path: string;
			constructor(...parts: unknown[]) {
				this.path = pathOf(parts);
			}
			info() {
				return { exists: files.has(this.path) };
			}
			text() {
				return files.get(this.path) as string;
			}
			create() {
				files.set(this.path, "");
			}
			write(value: string) {
				files.set(this.path, value);
			}
			delete() {
				files.delete(this.path);
			}
			async move(destination: File) {
				files.set(destination.path, files.get(this.path) as string);
				files.delete(this.path);
			}
		}
		const fs = {
			Paths: { document: { path: "doc" } },
			Directory,
			File,
		} as unknown as PreferenceFileSystem;
		return { fs, files };
	}

	it("round-trips and replaces a value, leaving no staging file", async () => {
		const { fs, files } = fakeFs();
		const backend = filePreferenceBackend(async () => fs);
		await backend.set(THEME_SELECTION_KEY, "one");
		await backend.set(THEME_SELECTION_KEY, "two");
		expect(await backend.get(THEME_SELECTION_KEY)).toBe("two");
		expect([...files.keys()]).toEqual([
			"doc/lo-mobile-preferences/lo-mobile-appearance.json",
		]);
	});

	it("reads the staged value when a kill landed between delete and move", async () => {
		const { fs, files } = fakeFs();
		files.set(
			"doc/lo-mobile-preferences/lo-mobile-appearance.json.next",
			CHOSEN,
		);
		expect(
			await filePreferenceBackend(async () => fs).get(THEME_SELECTION_KEY),
		).toBe(CHOSEN);
	});
});

describe("hydrating only from a read that succeeded", () => {
	it("does not hydrate on a failed read, and retries on the next active", async () => {
		let locked = true;
		let activate: (() => void) | null = null;
		const values: (string | null)[] = [];
		hydrateWhenAvailable({
			read: async () => {
				if (locked) throw new Error("errSecInteractionNotAllowed");
				return CHOSEN;
			},
			onValue: (raw) => values.push(raw),
			subscribeActive: (listener) => {
				activate = listener;
				return () => {
					activate = null;
				};
			},
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(values).toEqual([]);
		expect(activate).not.toBeNull();

		locked = false;
		(activate as unknown as () => void)();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(values).toEqual([CHOSEN]);
		expect(activate).toBeNull(); // unsubscribed once read
	});
});

describe("writing a theme change over what was stored", () => {
	it("keeps a theme id this build does not ship when the reader changes only the mode", () => {
		/* A newer build, or a theme the contrast gate withheld from this one. */
		const stored = JSON.stringify({
			v: 1,
			mode: "dark",
			lightTheme: "localOperatorLight",
			darkTheme: "aThemeFromALaterBuild",
		});
		const hydrated = parseSelection(stored);
		expect(hydrated.darkTheme).toBe(DEFAULT_SELECTION.darkTheme); // display fallback

		const written = JSON.parse(
			serializeSelectionOver(stored, hydrated, { ...hydrated, mode: "light" }),
		);
		expect(written.mode).toBe("light");
		expect(written.darkTheme).toBe("aThemeFromALaterBuild");
	});

	it("keeps unknown fields and a newer version label", () => {
		const stored = JSON.stringify({
			v: 3,
			mode: "system",
			lightTheme: "localOperatorLight",
			darkTheme: "dracula",
			contrast: "high",
		});
		const hydrated = parseSelection(stored);
		const written = JSON.parse(
			serializeSelectionOver(stored, hydrated, {
				...hydrated,
				darkTheme: "localOperatorDark",
			}),
		);
		expect(written).toEqual({
			v: 3,
			mode: "system",
			lightTheme: "localOperatorLight",
			darkTheme: "localOperatorDark",
			contrast: "high",
		});
	});

	it("writes the whole choice when nothing was stored", () => {
		const next = { ...DEFAULT_SELECTION, mode: "dark" as const };
		expect(
			JSON.parse(serializeSelectionOver(null, DEFAULT_SELECTION, next)),
		).toEqual({
			v: 1,
			...next,
		});
	});
});

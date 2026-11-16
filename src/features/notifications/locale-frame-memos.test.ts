import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/* Regression guard for review M1 (PR #276): the inbox and the Team Bridge
 * thread cached `t()`-rendered copy in `useMemo`s (section titles; day dividers)
 * and in a `memo()` row that read `activeLocale()` internally, but neither
 * screen subscribed to the language. A language frame therefore left the
 * previous language on screen until unrelated state moved.
 *
 * WHY THIS IS A SOURCE TEST — the same reason as
 * `src/features/home/localized-memos.test.ts`: `vitest.config.ts` runs in Node
 * with no React renderer, and both screens pull expo-router, uniwind and
 * lucide. This pins the mechanical halves `useLocaleFrame` documents
 * (connection-provider.tsx): the subscription, and the language in the memo
 * dependencies. It does NOT prove a mounted screen repaints; that is the native
 * E2E layer's job. The store half (a frame notifies `useLocaleFrame`'s store)
 * is asserted behaviourally in the Home test and not repeated here. */
const read = (...parts: string[]): string =>
	readFileSync(resolve(import.meta.dirname, "..", ...parts), "utf8");
const inbox = read("notifications", "notifications.tsx");
const thread = read("team-bridge", "thread-screen.tsx");

/** The next top-level declaration: where a function body ends. */
const NEXT_DECLARATION = /\n(?:export |const |function |type |interface )/;
/** `locale` destructured as a prop (its own line in the parameter list). */
const LOCALE_PROP = /\blocale,\n/;

/** Source with comments removed, so a doc comment that MENTIONS a call cannot
 *  satisfy or trip an assertion about code. */
const code = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The body of the top-level function or `memo(function …)` named `name`, up to
 *  the next top-level declaration. */
function functionBody(source: string, name: string): string {
	const start = source.search(new RegExp(`function ${name}\\(`));
	expect(start).toBeGreaterThan(-1);
	const rest = source.slice(start + 1);
	const next = rest.search(NEXT_DECLARATION);
	return next === -1 ? rest : rest.slice(0, next);
}

/** The dependency array of the hook call beginning at `marker`: the LAST
 *  `[...]` before the call's closing `\n\t);`. */
function dependencies(source: string, marker: string): string {
	const start = source.indexOf(marker);
	expect(start).toBeGreaterThan(-1);
	const end = source.indexOf("\n\t);", start);
	expect(end).toBeGreaterThan(start);
	const arrays = source.slice(start, end).match(/\[[^[\]]*\]/g) ?? [];
	const last = arrays.at(-1);
	expect(last).toBeDefined();
	return last ?? "";
}

describe("the inbox re-resolves its section titles on a language change", () => {
	const body = code(functionBody(inbox, "Notifications"));

	it("subscribes to the config frame the language arrives on", () => {
		expect(body).toContain("const language = useLocaleFrame();");
	});

	it("lists the language in the sections memo's dependencies", () => {
		expect(dependencies(body, "const sections = useMemo(")).toContain(
			"language",
		);
	});
});

describe("the Team Bridge thread re-resolves its copy on a language change", () => {
	const content = code(functionBody(thread, "ThreadContent"));
	const row = code(functionBody(thread, "ThreadMessageRow"));

	it("subscribes ThreadContent to the config frame", () => {
		expect(content).toContain("const language = useLocaleFrame();");
	});

	it("lists the language in the day-divider memo's dependencies", () => {
		expect(dependencies(content, "const items = useMemo(")).toContain(
			"language",
		);
	});

	it("gives the memoised row its locale as a prop, not a live read", () => {
		/* `ThreadMessageRow` is `memo()`: a read inside it re-runs only when
		 *  another prop changes, so the locale must be one of the props. */
		expect(row).not.toContain("activeLocale()");
		expect(row).toMatch(LOCALE_PROP);
		expect(row).toContain("model.messageTime(message.created_at, locale)");
		expect(content).toContain("locale={locale}");
	});

	it("rebuilds renderItem when the locale changes", () => {
		expect(dependencies(content, "const renderItem = useCallback(")).toContain(
			"locale",
		);
	});
});

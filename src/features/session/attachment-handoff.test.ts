import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAttachmentSheetHandoff } from "./attach-handoff";

const OWNER_ATTACH_FINALLY = /finally\s*\{\s*setAttaching\(false\)/;
const CANCEL_BEFORE_REOPEN =
	/onPress=\{\(\) => \{\s*attachmentHandoff\.cancel\(\);\s*setAttachSheetOpen\(true\);/;
const BRIDGE_CHOOSE =
	/setAttachOpen\(false\);\s*attachHandoff\.choose\(\(\) => \{\s*void addImages\(source\);\s*\}, Platform\.OS\);/;
const BRIDGE_CANCEL_BEFORE_REOPEN =
	/attachHandoff\.cancel\(\);\s*setAttachOpen\(true\);/;
const BRIDGE_DIRECT_LAUNCH =
	/onPress=\{\(\) => \{\s*void addImages\(source\);\s*\}\}/;
const HOME_DISMISS_SHOWN_LINE =
	/onDismissError=\{\s*startup\.snapshot\.error == null && composerError !== null\s*\? \(\) => setComposerError\(null\)\s*: undefined\s*\}/;
const source = readFileSync(
	new URL("./components/composer.tsx", import.meta.url),
	"utf8",
);
const create = () => createAttachmentSheetHandoff();
const read = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");
afterEach(() => vi.useRealTimers());
describe("native attachment sheet handoff", () => {
	it.each(["Home", "Session"])(
		"pending unmount cannot strand %s owner busy after dropping optional U1",
		(ownerName) => {
			vi.useFakeTimers();
			const owner = { busy: false };
			const launch = vi.fn(() => {
				owner.busy = true;
			});
			const handoff = create();
			handoff.choose(launch, "ios");
			// Home's split/column switch retains owner state while remounting its
			// Composer. Model that boundary with the REAL handoff's unmount cancel.
			handoff.cancel();
			const remounted = create();
			vi.runAllTimers();
			remounted.dismissed();
			expect(launch).not.toHaveBeenCalled();
			expect(owner.busy).toBe(false);
			const ownerPath =
				ownerName === "Home" ? "../home/home.tsx" : "./use-composer.ts";
			const ownerSource = readFileSync(
				new URL(ownerPath, import.meta.url),
				"utf8",
			);
			expect(ownerSource).not.toContain("onAttachStart");
			expect(ownerSource).not.toContain("beginAttach");
			expect(ownerSource).toMatch(OWNER_ATTACH_FINALLY);
			expect(source).not.toContain("onAccepted");
			expect(source).not.toContain("onAttachStart");
			const session = readFileSync(
				new URL("../../../app/(app)/session/[id].tsx", import.meta.url),
				"utf8",
			);
			expect(session).not.toContain("onAttachStart");
		},
	);
	it("cancel after a launch cannot clear an owner's running attach before finally", () => {
		vi.useFakeTimers();
		let busy = false;
		const handoff = create();
		const launch = vi.fn(() => {
			busy = true;
		});
		handoff.choose(launch, "ios");
		handoff.dismissed();
		expect(launch).toHaveBeenCalledOnce();
		expect(busy).toBe(true);
		handoff.cancel();
		handoff.dismissed();
		vi.runAllTimers();
		expect(busy).toBe(true);
		// Only the running owner's unchanged finally ends its busy state.
		busy = false;
		expect(busy).toBe(false);
	});
	it("keeps the first library choice when another row is pressed during native dismissal", () => {
		vi.useFakeTimers();
		const handoff = create();
		const library = vi.fn(),
			documents = vi.fn();
		handoff.choose(library, "ios");
		handoff.choose(documents, "ios");
		handoff.choose(documents, "ios");
		handoff.dismissed();
		vi.runAllTimers();
		expect(library).toHaveBeenCalledOnce();
		expect(documents).not.toHaveBeenCalled();
	});
	it("admits no stale press however long the native dismissal takes", () => {
		vi.useFakeTimers();
		const handoff = create();
		const library = vi.fn(),
			documents = vi.fn();
		handoff.choose(library, "ios");
		vi.advanceTimersByTime(250);
		handoff.choose(documents, "ios");
		vi.advanceTimersByTime(5_000);
		expect(library).not.toHaveBeenCalled();
		handoff.dismissed();
		expect(library).toHaveBeenCalledOnce();
		expect(documents).not.toHaveBeenCalled();
		handoff.choose(documents, "ios");
		handoff.dismissed();
		vi.runAllTimers();
		expect(documents).not.toHaveBeenCalled();
	});
	it("ignores stale presses after onDismiss until Attach explicitly reopens", () => {
		vi.useFakeTimers();
		const handoff = create();
		const library = vi.fn(),
			documents = vi.fn();
		handoff.choose(library, "ios");
		handoff.dismissed();
		handoff.choose(documents, "ios");
		handoff.dismissed();
		expect(library).toHaveBeenCalledOnce();
		expect(documents).not.toHaveBeenCalled();
		handoff.cancel();
		handoff.choose(documents, "ios");
		handoff.dismissed();
		vi.runAllTimers();
		expect(documents).toHaveBeenCalledOnce();
	});
	it("waits for native dismissal; a repeated onDismiss cannot launch twice", () => {
		vi.useFakeTimers();
		const handoff = create();
		const launch = vi.fn();
		handoff.choose(launch, "ios");
		expect(launch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(499);
		expect(launch).not.toHaveBeenCalled();
		handoff.dismissed();
		expect(launch).toHaveBeenCalledTimes(1);
		vi.runAllTimers();
		handoff.dismissed();
		expect(launch).toHaveBeenCalledTimes(1);
	});
	it("launches nothing without a selection or after unmount", () => {
		vi.useFakeTimers();
		const handoff = create();
		const launch = vi.fn();
		handoff.dismissed();
		vi.runAllTimers();
		expect(launch).not.toHaveBeenCalled();
		handoff.choose(launch, "ios");
		handoff.cancel();
		handoff.dismissed();
		vi.runAllTimers();
		expect(launch).not.toHaveBeenCalled();
	});
	it("cancels an old pending choice when Attach reopens before dismissal", () => {
		vi.useFakeTimers();
		const handoff = create();
		const stale = vi.fn();
		const fresh = vi.fn();
		handoff.choose(stale, "ios");
		vi.advanceTimersByTime(250);
		// Production Attach's onPress cancels before opening the sheet again.
		handoff.cancel();
		vi.advanceTimersByTime(500);
		handoff.dismissed();
		expect(stale).not.toHaveBeenCalled();
		handoff.choose(fresh, "ios");
		handoff.dismissed();
		vi.runAllTimers();
		expect(fresh).toHaveBeenCalledOnce();
		expect(stale).not.toHaveBeenCalled();
	});
	it.each(["android", "web"])("keeps %s selection immediate", (platform) => {
		vi.useFakeTimers();
		const handoff = create();
		const launch = vi.fn();
		handoff.choose(launch, platform);
		expect(launch).toHaveBeenCalledTimes(1);
		handoff.dismissed();
		vi.runAllTimers();
		expect(launch).toHaveBeenCalledTimes(1);
	});
	it("iOS never launches before a late native dismissal (no timer race, TestFlight 1157)", () => {
		vi.useFakeTimers();
		const handoff = create();
		const launch = vi.fn();
		handoff.choose(launch, "ios");
		// A busy JS thread stretches the sheet's exit past any fixed deadline.
		vi.advanceTimersByTime(5_000);
		expect(launch).not.toHaveBeenCalled();
		handoff.dismissed();
		expect(launch).toHaveBeenCalledOnce();
	});
	it("wires the real composer choice and native dismissal without changing close/layout", () => {
		expect(source).toContain("onDismiss={attachmentHandoff.dismissed}");
		expect(source).toContain("attachmentHandoff.choose(");
		expect(source).toMatch(CANCEL_BEFORE_REOPEN);
		expect(source).toContain(
			"// The handoff waits for native dismissal; state alone is not that acknowledgement.",
		);
		expect(source).toContain("() => onAttach(action.source)");
		expect(source).toContain("onClose={() => setAttachSheetOpen(false)}");
		// One shared rule: the composer imports it rather than keeping a copy.
		expect(source).toContain(
			'import { createAttachmentSheetHandoff } from "@/features/session/attach-handoff";',
		);
		expect(source).not.toContain(
			"export function createAttachmentSheetHandoff",
		);
	});
	/* Team Bridge's attach sheet launched PHPicker on the same tick as its close
	 * (`void addImages(source)` straight from the row) — the race this module
	 * exists for, with no wait at all. Pinned at the source boundary like the
	 * composer's wiring above: rendering the thread screen needs the native
	 * renderer this suite deliberately avoids. */
	it("routes Team Bridge's attach sheet through the same native-dismissal handoff", () => {
		const bridge = read("../team-bridge/thread-screen.tsx");
		expect(bridge).toContain(
			'import { createAttachmentSheetHandoff } from "@/features/session/attach-handoff";',
		);
		expect(bridge).toContain("onDismiss={attachHandoff.dismissed}");
		expect(bridge).toMatch(BRIDGE_CHOOSE);
		expect(bridge).toMatch(BRIDGE_CANCEL_BEFORE_REOPEN);
		expect(bridge).toContain(
			"useEffect(() => () => attachHandoff.cancel(), [attachHandoff]);",
		);
		// The row no longer launches directly.
		expect(bridge).not.toMatch(BRIDGE_DIRECT_LAUNCH);
	});
	it("lets Home's reader dismiss a refused or failed pick's line, only while it is shown", () => {
		const home = read("../home/home.tsx");
		expect(home).toMatch(OWNER_ATTACH_FINALLY);
		expect(home).toContain("setComposerError(composerCopy().attachError);");
		expect(home).toMatch(HOME_DISMISS_SHOWN_LINE);
	});
});

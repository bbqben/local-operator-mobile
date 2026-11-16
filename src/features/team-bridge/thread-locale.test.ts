import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import {
	activeLocale,
	renderFor,
	resetLocaleSource,
	setLocaleSource,
} from "@/i18n";
import type { Message } from "@/team-bridge/contract";
import { messageTime, threadItems } from "@/team-bridge/model";

/**
 * O3-a: the Team Bridge thread's day dividers and message times follow the APP
 * language. Before, `thread-screen.tsx` called `threadItems()`/`messageTime()`
 * with no locale, so `toLocaleDateString(undefined, …)` used the device default:
 * a Spanish-UI reader on an English device saw English dates beside Spanish
 * chrome, and "Today"/"Yesterday" were English literals in every language.
 *
 * Assertions compare against the catalogue (`renderFor`) and `Intl` for the same
 * locale rather than hard-coded Spanish, so they hold before and after the
 * audited translations land.
 */

const message = (seq: number, iso: string): Message =>
	({
		id: `m${seq}`,
		seq,
		created_at: iso,
		sender: { account_id: "acct-a", kind: "person", display_label: "Ada" },
		body: "hi",
	}) as unknown as Message;

const dayLabels = (locale: string | undefined): string[] =>
	threadItems(
		[
			message(1, new Date("2026-10-14T09:00:00").toISOString()),
			message(2, new Date("2026-10-20T09:00:00").toISOString()),
			message(3, new Date("2026-10-21T09:00:00").toISOString()),
		],
		new Date("2026-10-21T18:00:00"),
		locale,
	).flatMap((item) => (item.type === "day" ? [item.label] : []));

afterEach(() => resetLocaleSource());

describe("Team Bridge day dividers follow the app language", () => {
	it("keys Today/Yesterday and dates the rest in the active locale", () => {
		setLocaleSource(() => "es");
		expect(activeLocale()).toBe("es");
		expect(dayLabels(activeLocale())).toEqual([
			new Date("2026-10-14T09:00:00").toLocaleDateString("es", {
				weekday: "long",
				month: "long",
				day: "numeric",
			}),
			renderFor("mobile.time.bucket.yesterday", {}, "es"),
			renderFor("mobile.time.bucket.today", {}, "es"),
		]);
	});

	it("renders the shipped English words for an English reader", () => {
		expect(dayLabels("en")).toEqual([
			"Wednesday, October 14",
			"Yesterday",
			"Today",
		]);
	});

	it("formats a message time in the locale it is given", () => {
		const iso = new Date("2026-10-21T15:05:00").toISOString();
		expect(messageTime(iso, "es")).toBe(
			new Date(iso).toLocaleTimeString("es", {
				hour: "numeric",
				minute: "2-digit",
			}),
		);
	});
});

describe("thread-screen passes the app locale (source guard)", () => {
	const source = readFileSync(
		new URL("./thread-screen.tsx", import.meta.url),
		"utf8",
	);
	const THREAD_ITEMS =
		/model\.threadItems\(\s*thread\?\.messages \?\? \[\],\s*new Date\(\),\s*locale,?\s*\)/;
	const MESSAGE_TIME =
		/model\.messageTime\(\s*message\.created_at,\s*activeLocale\(\)\s*\)/;

	it("threads activeLocale() into the day dividers and the message times", () => {
		expect(source).toMatch(THREAD_ITEMS);
		expect(source).toMatch(/const locale = activeLocale\(\);/);
		expect(source).toMatch(MESSAGE_TIME);
	});

	it("negative control: the pre-O3-a calls (no locale) do not match", () => {
		expect(
			"model.threadItems(thread?.messages ?? [], new Date()),",
		).not.toMatch(THREAD_ITEMS);
		expect("{model.messageTime(message.created_at)}").not.toMatch(MESSAGE_TIME);
	});
});

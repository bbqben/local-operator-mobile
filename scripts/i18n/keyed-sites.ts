// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these are the retired template literals' SOURCE TEXT, matched verbatim against the scanner's tokens, not missed interpolations.
/**
 * Exact-file guard for keyed slices: the files a slice keyed may not quietly
 * grow back the literals it removed.
 *
 * WHY A SEPARATE GUARD RATHER THAN A WIDER SCANNER RULE. `check-strings.ts` is a
 * ratchet over three named rules (plus rule 4 inside `EXPRESSION_LITERAL_SCOPE`),
 * and its stated blind spots are exactly where the O3-a copy lived: a bare
 * `return "just now"` in an ordinary `.ts` module, a `${minutes} min ago`
 * template, a `title="Projects"` prop on a component that is not in the
 * attribute list. Widening a global rule to see them would also flag every
 * other un-keyed literal in these files (O3-b…e's work), which the shrink-only
 * baseline cannot absorb. So this guard is scoped to named files and to the
 * literals the slice retired — it can never fire on someone else's copy.
 *
 * TWO CHECKS PER FILE, because neither alone is enough:
 *  - `retired`: none of the exact literals the slice keyed may reappear as a
 *    string literal (comments are ignored; the tokeniser is the scanner's own).
 *    Plus `AGE_TEMPLATE` everywhere: a `${n} min ago`-shaped template is the
 *    shape this slice retired from six helpers, so a new spelling is caught too.
 *  - `keys`: every catalogue key the slice wired must still be called there.
 *    This covers literals that cannot be forbidden by text — the inbox's
 *    `"yesterday"` is also an `InboxSectionId` value in the same module.
 *
 * Adding a later slice: append its files here with the literals it keyed. Never
 * remove a retired literal to make a test pass; key the new copy instead.
 */

import { stringLiterals } from "./scan-strings.ts";

export interface KeyedSite {
	/** Repository-relative, POSIX separators. */
	readonly file: string;
	/** Exact literal texts (as the scanner tokenises them) that must not return. */
	readonly retired: readonly string[];
	/** Catalogue keys that must still be rendered through `t(...)` in the file. */
	readonly keys: readonly string[];
}

/** A relative-age template: `${minutes} min ago`, `${hours}h ago`, `${d} d ago`. */
const AGE_TEMPLATE = /^\$\{[^}]*\} ?(?:min|[smhdwy]) ago$/;

/** O3-a: section headers and the shared date/time copy (`mobile.time.*`). */
export const KEYED_SITES: readonly KeyedSite[] = [
	{
		file: "src/features/auth/computer-switcher-view.ts",
		retired: [
			"just now",
			"${minutes} min ago",
			"${hours} h ago",
			"${Math.round(hours / 24)} d ago",
		],
		keys: [
			"mobile.time.relative.just_now",
			"mobile.time.relative.minutes_ago",
			"mobile.time.relative.hours_ago",
			"mobile.time.relative.days_ago",
		],
	},
	{
		file: "src/features/notifications/notification-detail.tsx",
		retired: ["Notification", "Links", "Message"],
		keys: [
			"mobile.notifications.detail.title",
			"mobile.notifications.detail.section_notification",
			"mobile.notifications.detail.section_links",
			"mobile.notifications.detail.section_message",
		],
	},
	{
		file: "src/features/notifications/notifications-model.ts",
		/* `"yesterday"` is deliberately absent: it is also a section id here. */
		retired: [
			"Waiting on you",
			"Today",
			"Yesterday",
			"Earlier this week",
			"Earlier",
			"Waiting on you · ${count}",
			"Notifications",
			"just now",
			"${minutes}m ago",
			"${hours}h ago",
			"${days}d ago",
		],
		keys: [
			"mobile.notifications.section.waiting",
			"mobile.notifications.section.waiting_count",
			"mobile.time.bucket.today",
			"mobile.time.bucket.yesterday",
			"mobile.time.bucket.earlier_this_week",
			"mobile.time.bucket.earlier",
			"mobile.time.relative.just_now",
			"mobile.time.relative.minutes_ago_compact",
			"mobile.time.relative.hours_ago_compact",
			"mobile.time.relative.days_ago_compact",
			"mobile.time.relative.yesterday",
		],
	},
	{
		file: "src/features/past/past.tsx",
		/* The month abbreviations (`absoluteDate`) are out of O3-a by decision:
		 * design owns whether they become `Intl.DateTimeFormat`. */
		retired: [
			"just now",
			"${minutes} min ago",
			"${hours} h ago",
			"${Math.round(hours / 24)} d ago",
		],
		keys: [
			"mobile.time.relative.just_now",
			"mobile.time.relative.minutes_ago",
			"mobile.time.relative.hours_ago",
			"mobile.time.relative.days_ago",
		],
	},
	{
		file: "src/features/projects/project-detail.tsx",
		retired: ["progress", "milestones", "linked sessions"],
		keys: [
			"mobile.projects.section.progress",
			"mobile.projects.section.milestones",
			"mobile.projects.section.linked_sessions",
		],
	},
	{
		file: "src/features/projects/projects.tsx",
		retired: ["Projects"],
		keys: ["mobile.projects.title"],
	},
	{
		file: "src/features/schedules/schedules-copy.ts",
		retired: [
			"${Math.floor(magnitude)}s",
			"${Math.floor(magnitude / 60)}m",
			"${Math.floor(magnitude / 3_600)}h",
			"${Math.floor(magnitude / 86_400)}d",
		],
		keys: [
			"mobile.time.short.seconds",
			"mobile.time.short.minutes",
			"mobile.time.short.hours",
			"mobile.time.short.days",
		],
	},
	{
		file: "src/features/schedules/schedules.tsx",
		retired: [
			"Schedules",
			"Wakes",
			"Monitors",
			"Wakes · ${wakeSectionSummary(allWakeRows(wakes, nowMs))}",
			"Monitors · ${monitorSectionSummary(allMonitorRows(monitors, nowMs))}",
		],
		keys: [
			"mobile.chrome.destination.schedules",
			"mobile.schedules.section.wakes",
			"mobile.schedules.section.wakes_summary",
			"mobile.schedules.section.monitors",
			"mobile.schedules.section.monitors_summary",
		],
	},
	{
		file: "src/features/session/components/composer.tsx",
		retired: ["attach"],
		keys: ["mobile.session.sheet_title.attach"],
	},
	{
		file: "src/features/session/components/slash-sheet.tsx",
		retired: ["commands"],
		keys: ["mobile.session.sheet_title.commands"],
	},
	{
		file: "src/features/session/connection-view.ts",
		retired: ["${whole}s", "${minutes}m", "${Math.floor(minutes / 60)}h"],
		keys: [
			"mobile.time.short.seconds",
			"mobile.time.short.minutes",
			"mobile.time.short.hours",
		],
	},
	{
		file: "src/features/sessions/session-projection.ts",
		retired: [
			"just now",
			"${seconds}s ago",
			"${minutes} min ago",
			"${hours}h ago",
			"${Math.round(hours / 24)}d ago",
			"now",
			"${minutes} min",
			"${hours}h",
			"${days}d",
			"${weeks}w",
			"${Math.floor(days / 365)}y",
		],
		keys: [
			"mobile.time.relative.just_now",
			"mobile.time.relative.seconds_ago_compact",
			"mobile.time.relative.minutes_ago",
			"mobile.time.relative.hours_ago_compact",
			"mobile.time.relative.days_ago_compact",
			"mobile.time.relative.now",
			"mobile.time.short.minutes_spaced",
			"mobile.time.short.hours",
			"mobile.time.short.days",
			"mobile.time.short.weeks",
			"mobile.time.short.years",
		],
	},
	{
		file: "src/features/settings/notifications-section.tsx",
		retired: ["Notifications"],
		keys: ["mobile.settings.section.notifications"],
	},
	{
		file: "src/lib/format.ts",
		retired: [
			"${seconds}s",
			'${minutes}m ${String(rest).padStart(2, "0")}s',
			'${hours}h ${String(minutes % 60).padStart(2, "0")}m',
		],
		keys: [
			"mobile.time.short.seconds",
			"mobile.time.short.minutes_seconds",
			"mobile.time.short.hours_minutes",
		],
	},
	{
		file: "src/team-bridge/model.ts",
		retired: [
			"Today",
			"Yesterday",
			"now",
			"${minutes}m",
			"${hours}h",
			"${days}d",
		],
		keys: [
			"mobile.time.bucket.today",
			"mobile.time.bucket.yesterday",
			"mobile.time.relative.now",
			"mobile.time.short.minutes",
			"mobile.time.short.hours",
			"mobile.time.short.days",
		],
	},
];

/** Every way `source` breaks `site`, as readable lines; empty when it holds. */
export function keyedSiteViolations(site: KeyedSite, source: string): string[] {
	const violations: string[] = [];
	const retired = new Set(site.retired);
	const literals = stringLiterals(source);
	for (const literal of literals) {
		const text = literal.text.trim();
		if (retired.has(text) || AGE_TEMPLATE.test(text)) {
			violations.push(
				`${site.file}:${literal.line}: un-keyed literal ${JSON.stringify(text)}`,
			);
		}
	}
	/* Keys are matched against string LITERALS, not raw source, so a key that
	 * survives only in a comment does not count; `tsc` proves the `t()` call
	 * around the literal is well-typed. */
	const present = new Set(literals.map((literal) => literal.text));
	for (const key of site.keys) {
		if (!present.has(key)) {
			violations.push(`${site.file}: no longer renders ${key}`);
		}
	}
	return violations;
}

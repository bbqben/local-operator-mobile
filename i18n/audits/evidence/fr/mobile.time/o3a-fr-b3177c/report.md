# fr audit — mobile.time — O3-a (o3a-fr-b3177c)

Verdict: **passed** — 0 BLOCKER/MAJOR; 4 findings total.
Auditor: i18n-auditor (team lopdev), model anthropic/claude-opus-5-5, session b3177ce4b009 — independent of translator session ebd00d285127.
Draft: draft-fr.json sha256 6e5b6412…42fd, read directly (not the relay); brief sha256 c57d0b16…f70d; en/context at local-operator-mobile 26663e18.

Keys audited (23): `mobile.time.bucket.today`, `mobile.time.bucket.yesterday`, `mobile.time.bucket.earlier_this_week`, `mobile.time.bucket.earlier`, `mobile.time.relative.now`, `mobile.time.relative.just_now`, `mobile.time.relative.yesterday`, `mobile.time.relative.seconds_ago_compact`, `mobile.time.relative.minutes_ago`, `mobile.time.relative.hours_ago`, `mobile.time.relative.days_ago`, `mobile.time.relative.minutes_ago_compact`, `mobile.time.relative.hours_ago_compact`, `mobile.time.relative.days_ago_compact`, `mobile.time.short.seconds`, `mobile.time.short.minutes`, `mobile.time.short.hours`, `mobile.time.short.days`, `mobile.time.short.weeks`, `mobile.time.short.years`, `mobile.time.short.minutes_spaced`, `mobile.time.short.minutes_seconds`, `mobile.time.short.hours_minutes`

## Mechanical
Placeholders and ICU shape identical to en; every plural carries exactly one/many/other with `#` in each arm; NFC; U+2019 apostrophes, no U+0027; no : ; ! ? needing U+202F; redaction marker hits 0. Checker negative controls caught a dropped `many`, a renamed variable, an unbalanced brace and an ASCII apostrophe (see audit.log).

## Judgement
Buckets match shipped relay.notifications.section.* (Aujourd’hui/Hier/Plus tôt) and mobile.sidebar.section.today. « Plus tôt cette semaine » idiomatic, 22/24. « à l’instant » shared by now/just_now matches the desktop corpus. Units min/h/j match relay.notifications.age.*; « sem. » standard. « 2 h 07 min » / « 4 min 07 s » correct duration forms; translator rightly avoids « 2 h 07 » (clock-time reading). {seconds}/{minutes} padded placeholders untouched, order kept.

## Findings
- **FR-T1 MINOR** `mobile.time.relative.now` — current: à l’instant. 11 chars vs the ~6 hint; translator flagged. Verified non-clipping: session-drawer stamp is shrink-0 and the title ellipsizes (list-row.tsx L524-535), so the cost is ~5 mono cells of title, not truncation. Team Bridge slot not inspected but already hosts 7-char date fallbacks. Suggested: Keep (matches shipped relay.notifications.age.now / tui.notifications.just_now). If design measures the drawer as too tight, the only idiomatic ≤7 form is « < 1 min » (7) — design call, not a translation defect.
- **FR-T2 MINOR** `mobile.time.relative.*_compact, short.minutes, short.weeks, short.years` — current: il y a 59 min (13/~10), il y a 59 s / 23 h / 30 j (11/~10), 59 min (6/~4), 51 sem. (7/~4), 12 ans (6/~4). Over the width hints. Verified non-breaking: inbox clock and drawer stamp are single-line shrink-0 boxes; the siblings shrink. Wording is the correct short French; « il y a » must stay because relativeTime() also feeds the row's spoken label, where a bare « 59 min » reads as a duration. Suggested: No wording change. Compact == spaced is right: French does not glue « 5m » (reads as metres).
- **FR-T3 NIT** `mobile.time.short.years` — current: many {# ans}. fr style guide §Plurals: many takes « de » before a full noun (« 1 000 000 de sessions »); « ans » is a noun, not an abbreviation like min/h/j/sem. Unreachable in practice. Suggested: {count, plural, one {# an} many {# d’ans} other {# ans}}
- **FR-T4 NIT** `mobile.time (all unit strings)` — current: U+0020 between number and unit (« 2 h 07 min »). French typography prefers a no-break space between a number and its unit. The shipped relay.notifications.age.* uses U+0020, and every render site is single-line, so there is no wrap risk. Suggested: No change in this slice; a corpus-wide U+00A0/U+202F decision belongs in the style guide.

## Width (worst realistic value / hint)
- `mobile.time.bucket.today`: "Aujourd’hui" 11 / ~16
- `mobile.time.bucket.yesterday`: "Hier" 4 / ~16
- `mobile.time.bucket.earlier_this_week`: "Plus tôt cette semaine" 22 / ~24
- `mobile.time.bucket.earlier`: "Plus tôt" 8 / ~16
- `mobile.time.relative.now`: "à l’instant" 11 / ~6
- `mobile.time.relative.just_now`: "à l’instant" 11 / ~12
- `mobile.time.relative.yesterday`: "hier" 4
- `mobile.time.relative.seconds_ago_compact`: "il y a 59 s" 11 / ~10
- `mobile.time.relative.minutes_ago`: "il y a 59 min" 13 / ~14
- `mobile.time.relative.hours_ago`: "il y a 23 h" 11 / ~12
- `mobile.time.relative.days_ago`: "il y a 30 j" 11 / ~12
- `mobile.time.relative.minutes_ago_compact`: "il y a 59 min" 13 / ~10
- `mobile.time.relative.hours_ago_compact`: "il y a 23 h" 11 / ~10
- `mobile.time.relative.days_ago_compact`: "il y a 30 j" 11 / ~10
- `mobile.time.short.seconds`: "59 s" 4 / ~4
- `mobile.time.short.minutes`: "59 min" 6 / ~4
- `mobile.time.short.hours`: "23 h" 4 / ~4
- `mobile.time.short.days`: "6 j" 3 / ~4
- `mobile.time.short.weeks`: "51 sem." 7 / ~4
- `mobile.time.short.years`: "12 ans" 6 / ~4
- `mobile.time.short.minutes_spaced`: "59 min" 6 / ~7
- `mobile.time.short.minutes_seconds`: "59 min 07 s" 11
- `mobile.time.short.hours_minutes`: "12 h 07 min" 11

Ledger: not appended. The task scopes the repo as read-only; the manager owns `scripts/i18n/ledger.py append`, using this record.

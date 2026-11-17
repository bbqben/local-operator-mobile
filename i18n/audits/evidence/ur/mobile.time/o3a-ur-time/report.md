# O3-a ur audit — mobile.time (o3a-ur-time)

Auditor: i18n-auditor (lopdev), session 966cb6dc566f, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session bdbee2a271c1 — independent.

Draft: /Users/damian/.local-operator/sessions/bdbee2a271c1/scratchpad/o3a/draft-ur.json sha256 2ceedc0c2b53366bcbc2238cac66b488deade32abba4aa61a9572ea4eae617a7, read directly (no guardrail block). English/context: git show 26663e18:src/i18n/catalogues/en/mobile.time(.context).json. Keys: 23.

**Verdict: passed** — no translation BLOCKER/MAJOR. Translation findings: F1, F2. Code findings outside the translation verdict, routed to the coder: C1, C2, C3.

## Keys
| key | en | ur |
|---|---|---|
| mobile.time.bucket.today | Today | آج |
| mobile.time.bucket.yesterday | Yesterday | کل |
| mobile.time.bucket.earlier_this_week | Earlier this week | پچھلے چند دن |
| mobile.time.bucket.earlier | Earlier | پہلے |
| mobile.time.relative.now | now | ابھی |
| mobile.time.relative.just_now | just now | ابھی ابھی |
| mobile.time.relative.yesterday | yesterday | کل |
| mobile.time.relative.seconds_ago_compact | {count, plural, one {#s ago} other {#s ago}} | {count, plural, one {# سیکنڈ قبل} other {# سیکنڈ قبل}} |
| mobile.time.relative.minutes_ago | {count, plural, one {# min ago} other {# min ago}} | {count, plural, one {# منٹ قبل} other {# منٹ قبل}} |
| mobile.time.relative.hours_ago | {count, plural, one {# h ago} other {# h ago}} | {count, plural, one {# گھنٹہ قبل} other {# گھنٹے قبل}} |
| mobile.time.relative.days_ago | {count, plural, one {# d ago} other {# d ago}} | {count, plural, one {# دن قبل} other {# دن قبل}} |
| mobile.time.relative.minutes_ago_compact | {count, plural, one {#m ago} other {#m ago}} | {count, plural, one {# منٹ قبل} other {# منٹ قبل}} |
| mobile.time.relative.hours_ago_compact | {count, plural, one {#h ago} other {#h ago}} | {count, plural, one {# گھنٹہ قبل} other {# گھنٹے قبل}} |
| mobile.time.relative.days_ago_compact | {count, plural, one {#d ago} other {#d ago}} | {count, plural, one {# دن قبل} other {# دن قبل}} |
| mobile.time.short.seconds | {count, plural, one {#s} other {#s}} | {count, plural, one {# سیکنڈ} other {# سیکنڈ}} |
| mobile.time.short.minutes | {count, plural, one {#m} other {#m}} | {count, plural, one {# منٹ} other {# منٹ}} |
| mobile.time.short.hours | {count, plural, one {#h} other {#h}} | {count, plural, one {# گھنٹہ} other {# گھنٹے}} |
| mobile.time.short.days | {count, plural, one {#d} other {#d}} | {count, plural, one {# دن} other {# دن}} |
| mobile.time.short.weeks | {count, plural, one {#w} other {#w}} | {count, plural, one {# ہفتہ} other {# ہفتے}} |
| mobile.time.short.years | {count, plural, one {#y} other {#y}} | {count, plural, one {# سال} other {# سال}} |
| mobile.time.short.minutes_spaced | {count, plural, one {# min} other {# min}} | {count, plural, one {# منٹ} other {# منٹ}} |
| mobile.time.short.minutes_seconds | {minutes, plural, one {#m} other {#m}} {seconds}s | {minutes, plural, one {# منٹ} other {# منٹ}} {seconds} سیکنڈ |
| mobile.time.short.hours_minutes | {hours, plural, one {#h} other {#h}} {minutes}m | {hours, plural, one {# گھنٹہ} other {# گھنٹے}} {minutes} منٹ |

## Translation findings
### F1 — MINOR
- Keys: mobile.time.short.seconds, mobile.time.short.minutes, mobile.time.short.hours, mobile.time.short.days, mobile.time.short.weeks, mobile.time.short.years, mobile.time.relative.seconds_ago_compact, mobile.time.relative.hours_ago_compact, mobile.time.short.minutes_seconds, mobile.time.short.hours_minutes
- Current: e.g. «12 گھنٹے» (8), «12 سیکنڈ قبل» (12), «12 منٹ 07 سیکنڈ» (15)
- Problem: Over the sidecar width hints: short.* ~4 cells → 5–8; *_compact hours/seconds ~10 → 12; elapsed compounds 15 vs English 6. Urdu has no customary one-letter units, so no shorter idiomatic wording exists; sites at 26663e18 are shrink-0/flex (list-row.tsx:527, notifications.tsx:968), so the title shrinks rather than the time clipping. The stale short note (session-projection.ts, "12 chars at 200%") may wrap.
- Suggested: Keep the wording. Record a ur width exception for mobile.time.short.* / *_compact in i18n/style-guides/ur.md (as done for relay.health.reconnecting) and have the designer check the drawer row, transcript elapsed chip and stale note in a rendered RTL frame.
### F2 — MINOR
- Keys: mobile.time.short.hours, mobile.schedules.due.overdue (shipped, not in draft)
- Current: short.hours one = «# گھنٹہ» composed by schedules-copy.ts dueLabel into shipped «{label} سے تاخیر» → «1 گھنٹہ سے تاخیر»
- Problem: Before the postposition سے Urdu needs the oblique «1 گھنٹے سے تاخیر». The draft key is right for its standalone use (direct case «1 گھنٹہ»); the clash is the composition, reachable when 90–119 min overdue (dueLabel 5400≤|s|<7200 → count 1). «1 گھنٹہ بعد» (due.ahead) is fine.
- Suggested: Do not change the draft key. In a follow-up, reword shipped mobile.schedules.due.overdue so it takes the direct case, e.g. «{label} تاخیر» («1 گھنٹہ تاخیر» / «22 دن تاخیر»), or accept as colloquially tolerated.

## Code findings (not translation; do not gate the ur draft)
### C1 — MAJOR (code, outside the translation verdict)
- Sites (@26663e18): src/features/session/connection-view.ts:393,483 `Not answering — last update ${agoLabel(s)} ago.` / `${name} isn’t answering — last seen ${agoLabel(..)} ago.`; src/features/sessions/session-projection.ts:~175 `Last updated ${phrase}.` and ~201 `${phrase === "just now" ? "Just now" : phrase}.`; src/features/auth/computer-switcher-view.ts:229 `Asleep · ${relativeAgo(..)}`
- Problem: O3-a localised the duration/age but left the surrounding sentence as an unkeyed English literal. ur now renders e.g. «Not answering — last update 12 سیکنڈ ago.» / «Last updated 5 منٹ قبل.» (first strong = L → LTR base under dir=auto, Urdu run shown reversed relative to the sentence; English "ago" wrapped round a bare Urdu unit), and `phrase === "just now"` compares against the translated value (never true outside en) and appends a Latin "." to Urdu. Before 26663e18 these were coherent Latin (`12s`, `5 min ago`). Affects every non-en locale.
- Suggested: Key the wrappers in this slice (e.g. mobile.session.stale.last_updated «آخری اپ ڈیٹ {age}», connection C3/C7 sentences with {age}), drop the English string comparison (select the capitalised form by rung, not by text), or keep those three call sites on the old Latin formatter until they are keyed.
### C2 — MINOR (render risk, unverified)
- Sites (@26663e18): src/ui/components/list-row.tsx:527 time Text `text-mono-label`; src/ui/theme.css:140 `--text-mono-label--letter-spacing: 0.06em`, :277 `font-family: var(--font-mono)`
- Problem: The drawer row time now carries Urdu words («3 گھنٹے», «2 ہفتے») in a monospace face (no Arabic glyphs → fallback) with 0.06em tracking. Letter-spacing on a cursive script can break joins (iOS kern / some browsers). Not observed: no rendered frame exists.
- Suggested: Designer to capture an RTL frame (web + iOS) of the conversations drawer; if joins break, drop tracking/mono for that Text when direction is rtl.
### C3 — NIT (info, pre-existing logic)
- Sites (@26663e18): src/features/notifications/notifications-model.ts relativeTime (rounded hours) vs timeBucket (calendar days, :137-147)
- Problem: A row 24–35 h old shows «کل» (relative.yesterday) even when its calendar bucket is «پچھلے چند دن». Same in English ("yesterday" under "Earlier this week"). Not a translation issue.
- Suggested: None required for ur; note for the coder.

## Checks answered (whole slice)
- Mechanical: 40/40 keys, none added/dropped; ICU skeletons identical to en (my parser, with negative controls detected); plural selectors one/other only (CLDR ur); 0 bidi/zero-width controls; NFC; Latin digits only, no Urdu digits; 0 `redacted` hits; no Latin left in values; no trailing full stops on headings. The mobile repo validator (scripts/i18n TS) was NOT run: the brief makes the repo read-only, with no builds or tests.
- Register: آپ only where address occurs («آپ کا انتظار»); the imperative «منسلک کریں» is respectful.
- Plurals: hours one «گھنٹہ» / other «گھنٹے»; weeks one «ہفتہ» / other «ہفتے». سیکنڈ/منٹ/دن/سال stay invariant (correct). «1 گھنٹہ قبل» and «1 ہفتہ» are the standard direct case.
- earlier_this_week «پچھلے چند دن»: timeBucket (notifications-model.ts:137-147) covers 2–6 calendar days before today, a rolling window. "The past few days" fits it on every weekday; «اس ہفتے» would be wrong on Mon/Tue. PASS.
- «کل» is used for both yesterday and tomorrow. It renders only as (a) an inbox section heading between «آج» and «پچھلے چند دن», (b) a Team Bridge day divider over past messages (model.ts:530), and (c) the row age / a11y label of a past notification (notifications-model.ts:531). No future-facing site uses these keys, so the reading is unambiguous in practice; it matches relay.notifications.section.yesterday.
- BIDI: all 16 digit-initial values (mobile.time.relative.*_ago* ×7, short.* ×9) resolve their first STRONG character to Arabic letters (AL), so dir=auto (react-native-web), iOS Natural, and Android FIRSTSTRONG_LTR all resolve RTL. The ` · {count}` / ` · {summary}` keys open with Urdu (AL), and the shipped summary digits follow an AL, so W2 makes them AN and they stay in logical order; the visual order right→left is «بیداریاں · 3 شیڈول شدہ · 1 ناکام». schedules.tsx headers already pass labelDir={composedDir} (direction.tsx useComposedDir → web dir + native writingDirection). Other sites (notifications row meta, list-row time, team-bridge rowStamp, elapsed chip, Past row «age · date») render the value alone or Urdu-first, so they resolve RTL without help. LTR-container hazards exist only where O3-a code splices the Urdu value into an English literal: see C1. Native iOS/Android rendering is UNVERIFIED (no device or simulator frame; reasoning from UAX#9 and the RN source cited in direction.tsx).
- mobile.time.short.* reused as row-stamp ages (team-bridge rowStamp, drawer relativeTimeFor): a bare «5 منٹ» reads as a duration, but in a list's trailing time slot it is understood as age, the same as the English «5m». Note only.
- Widths: see F1. Arabic script ≈ 1 cell per code point (ur.md §Width).

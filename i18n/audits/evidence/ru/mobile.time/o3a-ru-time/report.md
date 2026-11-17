# ru audit: mobile.time (O3-a): changes_requested

Audit ID: o3a-ru-time. Date: 2026-11-15.
Auditor: i18n-auditor (lopdev), session 6bb2909e7a4f, model anthropic/claude-opus-5-5. Independent of the translator session c35c2a6c2253. No MT service was used.
Draft: `/Users/damian/.local-operator/sessions/c35c2a6c2253/scratchpad/o3a/draft-ru.json`, sha256 `6605a328d5db966ab42105e01c246aea9209f18afb56d0c063e7c489217ed83f`. Source commit: local-operator-mobile 26663e18. Keys: 23.

## Mechanical
The ICU structure parsed and placeholders match the source. All ru plural categories (one/few/many/other) are present. All strings are NFC. There are 0 redaction-marker hits and no NBSP. Negative controls confirm the checker detects these failures (see audit.log).

## Findings
- **RU-T1 MAJOR**: `mobile.time.bucket.earlier_this_week`
  - Current: Ранее на этой неделе
  - Problem: «на этой неделе» means the calendar week (Mon–Sun) to a Russian reader. timeBucket() (src/features/notifications/notifications-model.ts:134-146 @26663e18) uses a rolling window: todayStart-6*DAY_MS ≤ at < todayStart-DAY_MS, i.e. 2–6 calendar days ago. On Mon–Fri this bucket holds items from the previous calendar week, so the heading states the wrong week. Brief context also says "two to six days ago". Desktop tui.notifications.group_week carries the same latent defect (rolling <7 days, notifications_model.py:335) — pre-existing, not gated here, so the reuse precedent does not cure it.
  - Fix: «За последние 7 дней» (19 cells, ≤24); shorter alternative «Последние 7 дней» (16). Both are true of every item in the 2–6-day bucket and read naturally under «Сегодня»/«Вчера».
- **RU-T2 MINOR**: `mobile.time.short.* / *_compact / minutes_seconds`
  - Current: «45 сек»(6) «5 мин»(5) «2 дн.»(5) «3 нед.»(6); «12 сек назад»(12) «5 мин назад»(11) «4 дн. назад»(11); «4 мин 07 сек»(12)
  - Problem: Over the sidecar hints (~4 cells for short.*, ~10 for compact). The hints are approximate (no maxCells in the context), the translator flagged them, and no compliant shorter form exists («м» = metres; bare «с» reads as a preposition; ru style guide names «сек»/«мин»). Not gating, but the narrow meta slots (drawer time column, inbox meta, running-transcript timer) are unrendered.
  - Fix: Keep the wording. The design lane should render the drawer, inbox and transcript timer in ru. If it fits, record a ru budget exception in the style guide like the wave-3 inbox entry; if it clips, take a layout fix, not truncation.
- **RU-T3 NIT**: `mobile.time.relative.days_ago_compact`
  - Current: {count, plural, one {# дн. назад} few {# дн. назад} many {# дн. назад} other {# дн. назад}}
  - Problem: CLDR-valid, but the inbox shows only 2–6 days here (1 = «вчера»), and «2 дня назад» is the same width as «2 дн. назад» (11 cells) and reads more naturally; «5 дней назад» is +1 cell. It also differs from days_ago and relay.notifications.age.days, which show the same concept.
  - Fix: Optionally reuse the days_ago arms: one {# день назад} few {# дня назад} many {# дней назад} other {# дня назад}.
- **RU-T4 NIT**: `mobile.time.short.minutes_seconds, mobile.time.short.hours_minutes (and other number+unit strings)`
  - Current: U+0020 between number and unit
  - Problem: Russian typography keeps a number on the same line as its unit. In the two-unit timers a wrap would split «4 мин / 07 сек».
  - Fix: Optionally use U+00A0 between # and the unit, and between the {seconds}/{minutes} placeholder and its unit. This is a byte-level change only.

## Notes (checked, no finding)
- Plurals: every key has one/few/many/other. days_ago `other` «дня» is correct: CLDR ru `other` covers fractions, and fractions take the genitive singular («1,5 дня»), as in the style-guide example «# сессии». Integer counts never reach it. Agreement holds in one «день», few «дня» and many «дней» (renders checked at 0/1/2/5/11/12/21/22/59).
- Years: one/few/other «г.», many «л.» is the CLDR ru short duration-year pattern («1 г.», «2 г.», «5 л.», «11 л.», «21 г.»). Correct.
- Row-stamp reuse (deferred code fix): session-projection.ts:401-409 and team-bridge/model.ts:612-620 show short.minutes_spaced / short.minutes / hours / days / weeks / years bare as ages. Bare «5 мин», «3 ч», «2 дн.», «3 нед.», «2 г.» are ordinary compact age stamps in Russian list UIs, and «сейчас» works for <1 min, so there is no ru-specific misreading. The same tokens also read correctly inside «через {label}» and «просрочено на {label}». Informational only.
- Sources checked: «Сегодня», «Вчера», «Ранее», «только что», relay age.* and tui group_week/just_now all match the shipped ru copy the translator cites. relative.now «сейчас» is the idiomatic stamp for under a minute.

## Keys
| key | en | ru draft |
|---|---|---|
| `mobile.time.bucket.today` | "Today" | "Сегодня" |
| `mobile.time.bucket.yesterday` | "Yesterday" | "Вчера" |
| `mobile.time.bucket.earlier_this_week` | "Earlier this week" | "Ранее на этой неделе" |
| `mobile.time.bucket.earlier` | "Earlier" | "Ранее" |
| `mobile.time.relative.now` | "now" | "сейчас" |
| `mobile.time.relative.just_now` | "just now" | "только что" |
| `mobile.time.relative.yesterday` | "yesterday" | "вчера" |
| `mobile.time.relative.seconds_ago_compact` | "{count, plural, one {#s ago} other {#s ago}}" | "{count, plural, one {# сек назад} few {# сек назад} many {# сек назад} other {# сек назад}}" |
| `mobile.time.relative.minutes_ago` | "{count, plural, one {# min ago} other {# min ago}}" | "{count, plural, one {# мин назад} few {# мин назад} many {# мин назад} other {# мин назад}}" |
| `mobile.time.relative.hours_ago` | "{count, plural, one {# h ago} other {# h ago}}" | "{count, plural, one {# ч назад} few {# ч назад} many {# ч назад} other {# ч назад}}" |
| `mobile.time.relative.days_ago` | "{count, plural, one {# d ago} other {# d ago}}" | "{count, plural, one {# день назад} few {# дня назад} many {# дней назад} other {# дня назад}}" |
| `mobile.time.relative.minutes_ago_compact` | "{count, plural, one {#m ago} other {#m ago}}" | "{count, plural, one {# мин назад} few {# мин назад} many {# мин назад} other {# мин назад}}" |
| `mobile.time.relative.hours_ago_compact` | "{count, plural, one {#h ago} other {#h ago}}" | "{count, plural, one {# ч назад} few {# ч назад} many {# ч назад} other {# ч назад}}" |
| `mobile.time.relative.days_ago_compact` | "{count, plural, one {#d ago} other {#d ago}}" | "{count, plural, one {# дн. назад} few {# дн. назад} many {# дн. назад} other {# дн. назад}}" |
| `mobile.time.short.seconds` | "{count, plural, one {#s} other {#s}}" | "{count, plural, one {# сек} few {# сек} many {# сек} other {# сек}}" |
| `mobile.time.short.minutes` | "{count, plural, one {#m} other {#m}}" | "{count, plural, one {# мин} few {# мин} many {# мин} other {# мин}}" |
| `mobile.time.short.hours` | "{count, plural, one {#h} other {#h}}" | "{count, plural, one {# ч} few {# ч} many {# ч} other {# ч}}" |
| `mobile.time.short.days` | "{count, plural, one {#d} other {#d}}" | "{count, plural, one {# дн.} few {# дн.} many {# дн.} other {# дн.}}" |
| `mobile.time.short.weeks` | "{count, plural, one {#w} other {#w}}" | "{count, plural, one {# нед.} few {# нед.} many {# нед.} other {# нед.}}" |
| `mobile.time.short.years` | "{count, plural, one {#y} other {#y}}" | "{count, plural, one {# г.} few {# г.} many {# л.} other {# г.}}" |
| `mobile.time.short.minutes_spaced` | "{count, plural, one {# min} other {# min}}" | "{count, plural, one {# мин} few {# мин} many {# мин} other {# мин}}" |
| `mobile.time.short.minutes_seconds` | "{minutes, plural, one {#m} other {#m}} {seconds}s" | "{minutes, plural, one {# мин} few {# мин} many {# мин} other {# мин}} {seconds} сек" |
| `mobile.time.short.hours_minutes` | "{hours, plural, one {#h} other {#h}} {minutes}m" | "{hours, plural, one {# ч} few {# ч} many {# ч} other {# ч}} {minutes} мин" |

Verdict: **changes_requested**. Unresolved BLOCKER/MAJOR: 1.


## Round 2 addendum (2026-11-15)

New draft sha256 `e37f67d5830313d5dff27550e0fbb085460b08bd25cdc6b153fa38ab89a22dfd`. I rebuilt the round-1 baseline from this report's key tables, and it reproduces round-1 sha256 `6605a328…ed83f` exactly. 3 keys changed and the other 37 are byte-identical.

- **RU-T1 resolved**: «За последние 7 дней» (19/24 cells) is true of every item in the rolling 2–6-day bucket (notifications-model.ts:134-146) and reads naturally under «Сегодня»/«Вчера». Closed.
- **RU-T3 resolved**: Full-word arms one день / few дня / many дней / other дня agree correctly (other = genitive singular for fractions). 11–12 cells in the inbox range 2–6, the same as round 1; RU-T2 still covers it. Closed.
- RU-T2: MINOR, still open: deferred to design render, not gating
- RU-T4: NIT, still open: optional NBSP

Round-2 verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

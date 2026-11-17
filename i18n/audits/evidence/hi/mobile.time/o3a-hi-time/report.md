# O3-a hi audit — mobile.time (o3a-hi-time)

Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 3 MINOR. Keys: 23. Auditor: i18n-auditor, session 7f1fd014ba0d, model anthropic/claude-opus-5-5 (no fallback). Translator: session ea3ea9b9290e. No MT used.

## Mechanical
The JSON is valid. The key set and order match the brief. ICU args, plural arms (one/other) and the # count equal en. The text is NFC with no ZW*. Digits are Latin. There are 0 redaction-marker hits. The brief en/context hashes match 26663e18. A negative control caught the 4 seeded defects. See audit.log.

## Values
- `mobile.time.bucket.today` = आज  (en: Today)
- `mobile.time.bucket.yesterday` = कल  (en: Yesterday)
- `mobile.time.bucket.earlier_this_week` = पिछले कुछ दिन  (en: Earlier this week)
- `mobile.time.bucket.earlier` = पहले  (en: Earlier)
- `mobile.time.relative.now` = अभी  (en: now)
- `mobile.time.relative.just_now` = अभी-अभी  (en: just now)
- `mobile.time.relative.yesterday` = कल  (en: yesterday)
- `mobile.time.relative.seconds_ago_compact` = {count, plural, one {# सेकंड पहले} other {# सेकंड पहले}}  (en: {count, plural, one {#s ago} other {#s ago}})
- `mobile.time.relative.minutes_ago` = {count, plural, one {# मिनट पहले} other {# मिनट पहले}}  (en: {count, plural, one {# min ago} other {# min ago}})
- `mobile.time.relative.hours_ago` = {count, plural, one {# घंटा पहले} other {# घंटे पहले}}  (en: {count, plural, one {# h ago} other {# h ago}})
- `mobile.time.relative.days_ago` = {count, plural, one {# दिन पहले} other {# दिन पहले}}  (en: {count, plural, one {# d ago} other {# d ago}})
- `mobile.time.relative.minutes_ago_compact` = {count, plural, one {# मिनट पहले} other {# मिनट पहले}}  (en: {count, plural, one {#m ago} other {#m ago}})
- `mobile.time.relative.hours_ago_compact` = {count, plural, one {# घंटा पहले} other {# घंटे पहले}}  (en: {count, plural, one {#h ago} other {#h ago}})
- `mobile.time.relative.days_ago_compact` = {count, plural, one {# दिन पहले} other {# दिन पहले}}  (en: {count, plural, one {#d ago} other {#d ago}})
- `mobile.time.short.seconds` = {count, plural, one {# सेकंड} other {# सेकंड}}  (en: {count, plural, one {#s} other {#s}})
- `mobile.time.short.minutes` = {count, plural, one {# मिनट} other {# मिनट}}  (en: {count, plural, one {#m} other {#m}})
- `mobile.time.short.hours` = {count, plural, one {# घंटा} other {# घंटे}}  (en: {count, plural, one {#h} other {#h}})
- `mobile.time.short.days` = {count, plural, one {# दिन} other {# दिन}}  (en: {count, plural, one {#d} other {#d}})
- `mobile.time.short.weeks` = {count, plural, one {# हफ़्ता} other {# हफ़्ते}}  (en: {count, plural, one {#w} other {#w}})
- `mobile.time.short.years` = {count, plural, one {# साल} other {# साल}}  (en: {count, plural, one {#y} other {#y}})
- `mobile.time.short.minutes_spaced` = {count, plural, one {# मिनट} other {# मिनट}}  (en: {count, plural, one {# min} other {# min}})
- `mobile.time.short.minutes_seconds` = {minutes, plural, one {# मिनट} other {# मिनट}} {seconds} सेकंड  (en: {minutes, plural, one {#m} other {#m}} {seconds}s)
- `mobile.time.short.hours_minutes` = {hours, plural, one {# घंटा} other {# घंटे}} {minutes} मिनट  (en: {hours, plural, one {#h} other {#h}} {minutes}m)

## Terminology
Bucket words आज/कल/पहले and अभी-अभी, # मिनट/घंटा/घंटे/दिन पहले are all consistent with shipped relay.notifications.

## Findings
### HI-T1 — MINOR
- Keys: mobile.time.relative.hours_ago, mobile.time.relative.hours_ago_compact
- Current: {count, plural, one {# घंटा पहले} other {# घंटे पहले}}
- Problem: Before पहले ('ago') standard Hindi takes the oblique: 'एक घंटे पहले'; CLDR hi uses 'घंटे पहले' for one too. 'घंटा पहले' is common colloquially and matches shipped relay.notifications.age.hours, so it is not wrong, just less standard.
- Suggested: Optional: one {# घंटे पहले} other {# घंटे पहले}. If you change it, change relay.notifications.age.hours in the same wave so the two stay consistent. Otherwise keep as is. Does not gate.
### HI-T2 — MINOR
- Keys: mobile.time.short.hours, mobile.schedules.due.ahead (shipped, composes it)
- Current: short.hours one {# घंटा}; due.ahead '{label} में' → '1 घंटा में'
- Problem: The postposition में requires the oblique: '1 घंटे में'. dueLabel (schedules-copy.ts:114-141) passes short.hours count=1 into due.ahead when the due time is 90–119 min away, so '1 घंटा में' / 'अगली बार 1 घंटा में' is reachable. This is new in O3-a, because before it the token was the Latin '1h'. The bare uses (row stamp, '1 घंटा 05 मिनट') need the nominative, so short.hours itself is correct and cannot fix this.
- Suggested: Deferred to code/key: give dueLabel its own in-form (oblique) unit keys, or reword due.ahead into a form that takes the nominative. Do not change the short.hours one arm. Meaning stays clear; it is a one-count agreement slip in a 30-min window.
### HI-T3 — MINOR
- Keys: mobile.time.short.seconds, mobile.time.short.minutes, mobile.time.short.hours, mobile.time.short.days, mobile.time.short.weeks, mobile.time.short.years, mobile.time.relative.minutes_ago_compact, mobile.time.relative.seconds_ago_compact, mobile.time.short.minutes_seconds, mobile.time.short.hours_minutes
- Current: e.g. '59 सेकंड' (8 cp/6 cells), '2 हफ़्ते' (9 cp), '59 मिनट पहले' (12 cp/11 cells), '59 मिनट 59 सेकंड' (16 cp)
- Problem: These run over the ~4-char hint for short.* and the ~10 hint for *_compact. Overflow is not proven. The drawer time is shrink-0 next to a tail-ellipsized title (list-row.tsx:511-535), so the time never clips and the title loses width. The transcript clock reserves width from a localized 59:59 reference (working-line.tsx:317-324). team-bridge rowStamp has no .tsx consumer at 26663e18.
- Suggested: Keep the full words unless the designer's rendered frames show crowding. If they do, the customary short forms (CLDR hi short units) are '# से॰', '# मि॰', '# घं॰', e.g. '4 मि॰ 07 से॰'. Needs rendered proof, not a cell count.

## Checks / notes
- **C-ICU**: PASS: every plural is one/other (CLDR hi; one = 0 and 1). The घंटा/घंटे and हफ़्ता/हफ़्ते nominative split is correct for bare durations. सेकंड/मिनट/दिन/साल are invariant. Placeholders, '#' count and the zero-padded {seconds}/{minutes} text are identical to en.
- **C-KAL**: PASS: कल ('yesterday'/'tomorrow') is unambiguous. Every consumer is past-only: inbox buckets (timeBucket, notifications-model.ts:131-141), Team Bridge day dividers for earlier messages (team-bridge/model.ts:529-530), and inbox row meta for days===1 (notifications-model.ts:530-532). No future-date copy appears on those surfaces. This matches standard Hindi UI usage and shipped relay.notifications.section.yesterday.
- **C-WEEK**: PASS: bucket.earlier_this_week 'पिछले कुछ दिन' ('the last few days') is a rolling phrase. It matches the 2–6-day window (atMs >= todayStart-6*DAY_MS and < yesterday start; notifications-model.ts:135-141) on any weekday, and avoids the calendar-week reading that was MAJOR in ru. It sits under आज/कल and above पहले, so it reads as 'before yesterday'.
- **N1**: Note only, code fix deferred: short.minutes_spaced/hours/days/weeks/years act as row-stamp ages (session-projection.ts:400-409; team-bridge/model.ts:611-624). In Hindi, a bare '5 मिनट' reads as a duration, not an age. That ambiguity matches English '5m', so it is no translation defect. A dedicated *_ago row-stamp key would remove it.
- **N2**: Note, outside the slice: connection-view.ts:393 and :483 are still unkeyed English templates that embed agoLabel(). A hi reader would see 'Not answering — last update 12 सेकंड ago.' with mixed languages. This needs a code/key follow-up, not a translation change.

# O3-a vi audit — mobile.time (o3a-vi-tm)

Verdict: **passed** — 23 keys; unresolved BLOCKER/MAJOR: 0.

Auditor: i18n-auditor (lopdev), session aecc48976d9d, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session 91a37cc70236, so the audit is independent.
Inputs: draft-vi.json sha256 ca3c9293bcfba23594221410bb6796b6891b28b11d4df8d72d91f95a261d6484 (read directly, no guardrail block); brief sha256 c57d0b161780b9e12ffad7dec87a0d9b3da3ca1ea7d7eddc1ada9a4b7727f70d; English + context at 26663e18.

Mechanical checks: JSON valid; keys match the brief (none added or dropped); ICU parses; placeholders identical to source; plurals `other` only (CLDR vi); `#` kept; middle dots kept; NFC; 0 redaction hits; no wide or combining glyphs (every vi char is 1 terminal cell). See audit.log.

## Keys

| key | en | vi |
|---|---|---|
| `mobile.time.bucket.today` | `Today` | `Hôm nay` |
| `mobile.time.bucket.yesterday` | `Yesterday` | `Hôm qua` |
| `mobile.time.bucket.earlier_this_week` | `Earlier this week` | `Vài ngày trước` |
| `mobile.time.bucket.earlier` | `Earlier` | `Trước đó` |
| `mobile.time.relative.now` | `now` | `vừa xong` |
| `mobile.time.relative.just_now` | `just now` | `vừa xong` |
| `mobile.time.relative.yesterday` | `yesterday` | `hôm qua` |
| `mobile.time.relative.seconds_ago_compact` | `{count, plural, one {#s ago} other {#s ago}}` | `{count, plural, other {# giây trước}}` |
| `mobile.time.relative.minutes_ago` | `{count, plural, one {# min ago} other {# min ago}}` | `{count, plural, other {# phút trước}}` |
| `mobile.time.relative.hours_ago` | `{count, plural, one {# h ago} other {# h ago}}` | `{count, plural, other {# giờ trước}}` |
| `mobile.time.relative.days_ago` | `{count, plural, one {# d ago} other {# d ago}}` | `{count, plural, other {# ngày trước}}` |
| `mobile.time.relative.minutes_ago_compact` | `{count, plural, one {#m ago} other {#m ago}}` | `{count, plural, other {# ph trước}}` |
| `mobile.time.relative.hours_ago_compact` | `{count, plural, one {#h ago} other {#h ago}}` | `{count, plural, other {# giờ trước}}` |
| `mobile.time.relative.days_ago_compact` | `{count, plural, one {#d ago} other {#d ago}}` | `{count, plural, other {# ngày trước}}` |
| `mobile.time.short.seconds` | `{count, plural, one {#s} other {#s}}` | `{count, plural, other {# giây}}` |
| `mobile.time.short.minutes` | `{count, plural, one {#m} other {#m}}` | `{count, plural, other {# phút}}` |
| `mobile.time.short.hours` | `{count, plural, one {#h} other {#h}}` | `{count, plural, other {# giờ}}` |
| `mobile.time.short.days` | `{count, plural, one {#d} other {#d}}` | `{count, plural, other {# ngày}}` |
| `mobile.time.short.weeks` | `{count, plural, one {#w} other {#w}}` | `{count, plural, other {# tuần}}` |
| `mobile.time.short.years` | `{count, plural, one {#y} other {#y}}` | `{count, plural, other {# năm}}` |
| `mobile.time.short.minutes_spaced` | `{count, plural, one {# min} other {# min}}` | `{count, plural, other {# phút}}` |
| `mobile.time.short.minutes_seconds` | `{minutes, plural, one {#m} other {#m}} {seconds}s` | `{minutes, plural, other {# phút}} {seconds} giây` |
| `mobile.time.short.hours_minutes` | `{hours, plural, one {#h} other {#h}} {minutes}m` | `{hours, plural, other {# giờ}} {minutes} phút` |

## Findings

- **VI-O3A-TM-m1 — MINOR** — keys: `mobile.time.short.minutes_seconds`, `mobile.time.short.hours_minutes`, `mobile.time.short.seconds`, `mobile.time.short.minutes`, `mobile.time.short.hours`, `mobile.time.short.days`, `mobile.time.short.weeks`, `mobile.time.short.years`, `mobile.time.relative.now`, `mobile.time.relative.days_ago`, `mobile.time.relative.seconds_ago_compact`, `mobile.time.relative.minutes_ago_compact`, `mobile.time.relative.hours_ago_compact`, `mobile.time.relative.days_ago_compact`
  - Current: "{minutes, plural, other {# phút}} {seconds} giây" -> "59 phút 59 giây"; "# giây" -> "45 giây"; "vừa xong"
  - Problem: Over the context width hints: short.* 6-7 chars vs ~4; relative.now 8 vs ~6; *_ago_compact 11-13 vs ~10; days_ago 13 vs ~12. Worst case is the elapsed clock: working-line.tsx PhaseClock reserves elapsedLabel(3599) = "59 phút 59 giây" (15 mono cells vs en "59m 59s", 7) in a shrink-0 View. It does not overflow, but it takes ~8 more mono cells from the phase label beside it. The wording is the idiomatic vi register (vi Facebook/Google use "5 phút", "3 giờ", "2 ngày", "3 tuần"); Latin s/m/h would read as metres or chat slang. Does not gate.
  - Suggested: Keep the draft. Ask design for one rendered vi frame of the working line at 360 dp. Only if the phase label truncates badly, the smallest change reuses relay's shipped "ph": minutes_seconds "{minutes, plural, other {# ph}} {seconds} giây" (13 cells at 59:59).

## Audit notes (reasoning, not an execution log)

- bucket.earlier_this_week "Vài ngày trước": checked against notifications-model.ts timeBucket() at 26663e18 lines 135-141 (the task cited ~140). "week" means start-of-today minus 6 days up to start-of-yesterday, i.e. 2-6 local calendar days back, never the calendar week. "Vài ngày trước" ("a few days ago") is true for every item in that window on any weekday, Monday included. It does not collide with sidebar.section.week "Tuần này" (calendar), and Hôm nay / Hôm qua / Vài ngày trước / Trước đó reads naturally. No finding: the ru MAJOR / zh MINOR class does not recur.
- Row-stamp reuse (note only; code fix deferred): session-projection.ts:400-409 and team-bridge/model.ts:615-620 render ages through short.* ("12 phút", "3 giờ", "2 ngày", "3 tuần", "1 năm") with no "trước". In vi a bare duration in a list time column is the established age convention (vi Facebook/Messenger stamps), so it reads as an age, not a duration. The draft needs nothing beyond the deferred code fix. The same tokens read correctly as durations in schedules due ("sau 45 giây" / "trễ 2 giờ"), elapsed time and the connection age.
- Reuse verified byte-equal with relay.notifications vi: today/yesterday/earlier, age.now, age.minutes "# ph trước", age.hours, age.days. Mixed "ph" (minutes) vs spelled-out giờ/ngày in one ladder is inherited from shipped relay copy and is consistent across surfaces, so no finding.
- now and just_now are both "vừa xong": correct. "bây giờ" would mean "at present", not an age.

Ledger: not recorded. The repository is read-only for this task. This bundle lives in session scratch until a tracked commit lands it under i18n/audits/evidence/vi/mobile.time/o3a-vi-tm/.

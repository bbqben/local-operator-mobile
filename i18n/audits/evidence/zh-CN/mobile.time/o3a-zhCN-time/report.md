# zh-CN audit — mobile.time (O3-a) — o3a-zhCN-time

Auditor: i18n-auditor (lopdev), session 49772dd20be0, model anthropic/claude-opus-5-5. Translator session bb79330944ae (independent).
Draft route: direct read of the translator scratchpad (sha256 8ecdc5ced43efc97a73636f911d5fa1de14e8a5e12ad2f81c3a17f3e25eeb128 matches the attested hash); the relayed copy is dict-equal. Canonical sha256 cde876eefdc47d382c7e317105ca2f929afcf0c091f5e80bfe6d58a98d4d66ee.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

| key | en | zh-CN | cells (sample) | mechanical |
|---|---|---|---|---|
| `mobile.time.bucket.today` | Today | 今天 | 4 | OK |
| `mobile.time.bucket.yesterday` | Yesterday | 昨天 | 4 | OK |
| `mobile.time.bucket.earlier_this_week` | Earlier this week | 本周早些时候 | 12 | OK |
| `mobile.time.bucket.earlier` | Earlier | 更早 | 4 | OK |
| `mobile.time.relative.now` | now | 刚刚 | 4 | OK |
| `mobile.time.relative.just_now` | just now | 刚刚 | 4 | OK |
| `mobile.time.relative.yesterday` | yesterday | 昨天 | 4 | OK |
| `mobile.time.relative.seconds_ago_compact` | {count, plural, one {#s ago} other {#s ago}} | {count, plural, other {#秒前}} | 6 | OK |
| `mobile.time.relative.minutes_ago` | {count, plural, one {# min ago} other {# min ago}} | {count, plural, other {#分钟前}} | 8 | OK |
| `mobile.time.relative.hours_ago` | {count, plural, one {# h ago} other {# h ago}} | {count, plural, other {#小时前}} | 8 | OK |
| `mobile.time.relative.days_ago` | {count, plural, one {# d ago} other {# d ago}} | {count, plural, other {#天前}} | 6 | OK |
| `mobile.time.relative.minutes_ago_compact` | {count, plural, one {#m ago} other {#m ago}} | {count, plural, other {#分钟前}} | 8 | OK |
| `mobile.time.relative.hours_ago_compact` | {count, plural, one {#h ago} other {#h ago}} | {count, plural, other {#小时前}} | 8 | OK |
| `mobile.time.relative.days_ago_compact` | {count, plural, one {#d ago} other {#d ago}} | {count, plural, other {#天前}} | 6 | OK |
| `mobile.time.short.seconds` | {count, plural, one {#s} other {#s}} | {count, plural, other {#秒}} | 4 | OK |
| `mobile.time.short.minutes` | {count, plural, one {#m} other {#m}} | {count, plural, other {#分钟}} | 6 | OK |
| `mobile.time.short.hours` | {count, plural, one {#h} other {#h}} | {count, plural, other {#小时}} | 6 | OK |
| `mobile.time.short.days` | {count, plural, one {#d} other {#d}} | {count, plural, other {#天}} | 4 | OK |
| `mobile.time.short.weeks` | {count, plural, one {#w} other {#w}} | {count, plural, other {#周}} | 4 | OK |
| `mobile.time.short.years` | {count, plural, one {#y} other {#y}} | {count, plural, other {#年}} | 4 | OK |
| `mobile.time.short.minutes_spaced` | {count, plural, one {# min} other {# min}} | {count, plural, other {#分钟}} | 6 | OK |
| `mobile.time.short.minutes_seconds` | {minutes, plural, one {#m} other {#m}} {seconds}s | {minutes, plural, other {#分}}{seconds}秒 | 8 | OK |
| `mobile.time.short.hours_minutes` | {hours, plural, one {#h} other {#h}} {minutes}m | {hours, plural, other {#小时}}{minutes}分 | 10 | OK |

## Findings
- **ZH-T1 MINOR** `mobile.time.bucket.earlier_this_week`: current `本周早些时候`. The bucket is a rolling window (notifications-model.ts:140, todayStart-6d to yesterday), not the calendar week. Chinese 本周 strictly means the calendar week, so on a Monday, items from last Thu-Sat would sit under 本周早些时候 and the label would be wrong. English "this week" is looser. **Suggested:** 前几天 (matches "2-6 days ago"; reads naturally between 昨天 and 更早)
- **ZH-T2 MINOR** `mobile.time.short.hours / .days / .weeks / .years / .minutes (+ .minutes_spaced)`: current `#小时 / #天 / #周 / #年 / #分钟`. These are correct as durations (schedules "{label}后", "已逾期{label}", the transcript elapsed time). But the same keys are also used as ages in the session drawer row time (session-projection.ts:402-409) and the Team Bridge row stamp (team-bridge/model.ts:616-620). A bare "3小时" or "2年" in a row timestamp reads as a length of time, not "3 hours ago". This comes from reusing one key for two meanings; a translation of the shared key cannot fix it. **Suggested:** Keep the draft. Upstream (code, not this catalogue): make the row stamps use relative.*_ago_compact (#分钟前/#小时前/#天前), and add week/year ago keys (#周前/#年前). Non-gating.
- **ZH-T3 MINOR** `mobile.time.short.minutes / mobile.time.short.hours`: current `#分钟 / #小时`. At two-digit counts these are 6 terminal cells ("59分钟", "47小时") against a "~4 characters" tight-token hint, and they sit in narrow row-meta slots (Team Bridge row stamp, session drawer). No shorter idiomatic form exists: 分 alone is ambiguous in a bare stamp and 时 alone is not idiomatic. **Suggested:** No wording change. QA should check a rendered row with "59分钟" for clipping.
- **ZH-T4 NIT** `mobile.time.relative.*_ago / short.*`: current `#分钟前 (no space)`. The desktop/relay zh-CN (relay.notifications.age.minutes "# 分钟前") and some shipped mobile keys ("# 秒", "# 个监控") put a space after #. Other shipped keys ("再显示#个监控") do not. The draft follows the style guide rule of no space between CJK and digits, which is correct. The inconsistency elsewhere is pre-existing. **Suggested:** Keep the draft. Optionally normalise the older keys in a later pass.

Consistency checked against the shipped zh-CN catalogue @26663e18 (e.g. sidebar.section.today 今天, relay.chrome.session.subtitle.waiting 等待你处理, relay.chrome.drawer.projects 项目, settings.section.* 连接/外观/关于, the " · " separator in library.browse.filters_count) and the glossary (唤醒, 监控, 项目, 会话).

## Round 2 addendum (2026-11-16)

Scope: only the remediated keys. The draft file sha256 is now 953d337ff4c227f7f8d2ad7d95685af274bf9d15788a5907bda97499569e79a0 (matches the attested hash), canonical sha256 f8c03d70917154568bb219ac124128b7a027a13384ef9ee0207c9e277b129f81. The draft changes exactly 2 keys in total (ZH-T1, ZH-N1); the other 38 are byte-identical to round 1. The round-1 baseline was rebuilt from the relayed copy and verified by its canonical sha256 cde876…, because the translator's file was overwritten in place.

- **ZH-T1** `mobile.time.bucket.earlier_this_week`: `本周早些时候` → `前几天`. 前几天 fits the rolling 2-6-days-before-today window (notifications-model.ts:140) with no calendar-week claim. It reads naturally in the sequence 今天/昨天/前几天/更早 and is 6 cells against a ~24 hint. Resolved.

No new findings. The remaining round-1 MINOR/NIT findings in this namespace (if any) stand as recorded: non-gating, upstream or QA items. **Verdict: passed**, 0 unresolved BLOCKER/MAJOR.

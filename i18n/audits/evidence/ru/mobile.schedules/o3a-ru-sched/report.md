# ru audit: mobile.schedules (O3-a): passed

Audit ID: o3a-ru-sched. Date: 2026-11-15.
Auditor: i18n-auditor (lopdev), session 6bb2909e7a4f, model anthropic/claude-opus-5-5. Independent of the translator session c35c2a6c2253. No MT service was used.
Draft: `/Users/damian/.local-operator/sessions/c35c2a6c2253/scratchpad/o3a/draft-ru.json`, sha256 `6605a328d5db966ab42105e01c246aea9209f18afb56d0c063e7c489217ed83f`. Source commit: local-operator-mobile 26663e18. Keys: 4.

## Mechanical
The ICU structure parsed and placeholders match the source. All ru plural categories (one/few/many/other) are present. All strings are NFC. There are 0 redaction-marker hits and no NBSP. Negative controls confirm the checker detects these failures (see audit.log).

## Findings
- **RU-SC1 NIT**: `mobile.schedules.section.monitors, monitors_summary`
  - Current: Мониторы / Мониторы · {summary}
  - Problem: Glossary row "monitor → мониторинг" names the activity; the draft uses the object noun «мониторы». The draft is right: it matches the shipped, audited mobile.schedules.* («# монитор», «Нет активных мониторов»), and «Мониторы · 2 активных» agrees with summary.monitors_armed where «Мониторинг · 2 активных» would not. Recorded only so the glossary call is explicit.
  - Fix: No change to the copy. Add an object-sense note to the glossary («монитор» for a stored monitor), as note 7 does for hi.

## Notes (checked, no finding)
- «Пробуждения» per the glossary/style guide. {summary} is preserved after the middle dot, and «Пробуждения · 3 запланировано» composes correctly with summary.wakes.

## Keys
| key | en | ru draft |
|---|---|---|
| `mobile.schedules.section.wakes` | "Wakes" | "Пробуждения" |
| `mobile.schedules.section.wakes_summary` | "Wakes · {summary}" | "Пробуждения · {summary}" |
| `mobile.schedules.section.monitors` | "Monitors" | "Мониторы" |
| `mobile.schedules.section.monitors_summary` | "Monitors · {summary}" | "Мониторы · {summary}" |

Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

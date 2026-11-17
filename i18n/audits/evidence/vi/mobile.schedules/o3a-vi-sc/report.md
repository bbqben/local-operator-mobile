# O3-a vi audit — mobile.schedules (o3a-vi-sc)

Verdict: **passed** — 4 keys; unresolved BLOCKER/MAJOR: 0.

Auditor: i18n-auditor (lopdev), session aecc48976d9d, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session 91a37cc70236, so the audit is independent.
Inputs: draft-vi.json sha256 ca3c9293bcfba23594221410bb6796b6891b28b11d4df8d72d91f95a261d6484 (read directly, no guardrail block); brief sha256 c57d0b161780b9e12ffad7dec87a0d9b3da3ca1ea7d7eddc1ada9a4b7727f70d; English + context at 26663e18.

Mechanical checks: JSON valid; keys match the brief (none added or dropped); ICU parses; placeholders identical to source; plurals `other` only (CLDR vi); `#` kept; middle dots kept; NFC; 0 redaction hits; no wide or combining glyphs (every vi char is 1 terminal cell). See audit.log.

## Keys

| key | en | vi |
|---|---|---|
| `mobile.schedules.section.wakes` | `Wakes` | `Lần thức dậy` |
| `mobile.schedules.section.wakes_summary` | `Wakes · {summary}` | `Lần thức dậy · {summary}` |
| `mobile.schedules.section.monitors` | `Monitors` | `Giám sát` |
| `mobile.schedules.section.monitors_summary` | `Monitors · {summary}` | `Giám sát · {summary}` |

## Findings

- **VI-O3A-SC-n1 — NIT** — keys: `mobile.schedules.section.wakes`, `mobile.schedules.section.wakes_summary`
  - Current: Lần thức dậy
  - Problem: As a bare list heading "Lần thức dậy" reads as singular ("the wake-up occasion"). The shipped read_error already says "các lần thức dậy", and this same draft uses "các mốc" for projects. Acceptable as it is.
  - Suggested: Optional: "Các lần thức dậy" (15 chars, within ~16) and "Các lần thức dậy · {summary}".

## Audit notes (reasoning, not an execution log)

- Glossary: wake -> thức dậy (intransitive, correct, not đánh thức); monitor -> giám sát. Both match shipped count/show_* copy. "Giám sát" as a bare heading reads as the nominal category, as in vi settings headings.
- Summary composition renders "Lần thức dậy · 3 đã lên lịch · 1 thất bại" and "Giám sát · 2 đang bật": grammatical; the middle dot is kept.

Ledger: not recorded. The repository is read-only for this task. This bundle lives in session scratch until a tracked commit lands it under i18n/audits/evidence/vi/mobile.schedules/o3a-vi-sc/.

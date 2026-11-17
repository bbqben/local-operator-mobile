# O3-a vi audit — mobile.settings (o3a-vi-st)

Verdict: **passed** — 1 keys; unresolved BLOCKER/MAJOR: 0.

Auditor: i18n-auditor (lopdev), session aecc48976d9d, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session 91a37cc70236, so the audit is independent.
Inputs: draft-vi.json sha256 ca3c9293bcfba23594221410bb6796b6891b28b11d4df8d72d91f95a261d6484 (read directly, no guardrail block); brief sha256 c57d0b161780b9e12ffad7dec87a0d9b3da3ca1ea7d7eddc1ada9a4b7727f70d; English + context at 26663e18.

Mechanical checks: JSON valid; keys match the brief (none added or dropped); ICU parses; placeholders identical to source; plurals `other` only (CLDR vi); `#` kept; middle dots kept; NFC; 0 redaction hits; no wide or combining glyphs (every vi char is 1 terminal cell). See audit.log.

## Keys

| key | en | vi |
|---|---|---|
| `mobile.settings.section.notifications` | `Notifications` | `Thông báo` |

## Findings

None.

## Audit notes (reasoning, not an execution log)

- section.notifications "Thông báo" matches the register of the sibling headings Kết nối / Giao diện / Giới thiệu and mobile.notifications.title.

Ledger: not recorded. The repository is read-only for this task. This bundle lives in session scratch until a tracked commit lands it under i18n/audits/evidence/vi/mobile.settings/o3a-vi-st/.

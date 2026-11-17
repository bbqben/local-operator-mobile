# O3-a vi audit — mobile.notifications (o3a-vi-nt)

Verdict: **passed** — 6 keys; unresolved BLOCKER/MAJOR: 0.

Auditor: i18n-auditor (lopdev), session aecc48976d9d, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session 91a37cc70236, so the audit is independent.
Inputs: draft-vi.json sha256 ca3c9293bcfba23594221410bb6796b6891b28b11d4df8d72d91f95a261d6484 (read directly, no guardrail block); brief sha256 c57d0b161780b9e12ffad7dec87a0d9b3da3ca1ea7d7eddc1ada9a4b7727f70d; English + context at 26663e18.

Mechanical checks: JSON valid; keys match the brief (none added or dropped); ICU parses; placeholders identical to source; plurals `other` only (CLDR vi); `#` kept; middle dots kept; NFC; 0 redaction hits; no wide or combining glyphs (every vi char is 1 terminal cell). See audit.log.

## Keys

| key | en | vi |
|---|---|---|
| `mobile.notifications.section.waiting` | `Waiting on you` | `Chờ bạn` |
| `mobile.notifications.section.waiting_count` | `Waiting on you · {count}` | `Chờ bạn · {count}` |
| `mobile.notifications.detail.title` | `Notification` | `Thông báo` |
| `mobile.notifications.detail.section_notification` | `Notification` | `Nội dung` |
| `mobile.notifications.detail.section_links` | `Links` | `Liên kết` |
| `mobile.notifications.detail.section_message` | `Message` | `Tin nhắn` |

## Findings

None.

## Audit notes (reasoning, not an execution log)

- section_notification "Nội dung" (content) instead of a second "Thông báo" under the title "Thông báo": accepted. It is the natural vi heading above a body, and it stays distinct from section_message "Tin nhắn" (the quoted conversation message, noun, matching team_bridge "Tin nhắn").
- waiting "Chờ bạn" and waiting_count "Chờ bạn · {count}" match relay section.waiting. The relay form uses {count, number} where the en source is a bare {count}, so the draft correctly mirrors source.
- detail.title "Thông báo" and section_links "Liên kết" are consistent with mobile.notifications.title and relay detail.section.links.

Ledger: not recorded. The repository is read-only for this task. This bundle lives in session scratch until a tracked commit lands it under i18n/audits/evidence/vi/mobile.notifications/o3a-vi-nt/.

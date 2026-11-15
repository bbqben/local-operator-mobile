# Translation audit — vi · mobile.refusal · Radient Console brand slice

Audit ID: rcvi-refusa · Date: 2026-11-15 · Keys: 4
Auditor: i18n-auditor (team lopdev), session 8327197fa0aa, model anthropic/claude-opus-5-5 (no fallback observed). Translator session: 2a0b42cbac53 (independent). No MT service used.

## Verdict: passed — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT

## Mechanical
Placeholders identical to EN; `Radient Console` byte-exact (ASCII U+0020, capital R/C), count equal to EN per key; no residual «bảng điều khiển»; NFC; em dash spaced; key set equals en proposal. No plural/select (vi = `other` only). No repo validator applies to the flat scratch draft (mobile checkout HEAD d9b41018 has no src/i18n); checks run by auditor script — see audit.log.

## Per-key
| key | EN (proposed/override) | prior vi @0a629e65 | draft vi | judgement |
|---|---|---|---|---|
| `mobile.refusal.action.open_console` | Open Radient Console | Mở bảng điều khiển Radient | Mở Radient Console | Only change vs prior catalogue: «bảng điều khiển Radient» → «Radient Console» (glossary §1: exact brand, no generic replacement); rest byte-identical. |
| `mobile.refusal.console_disabled.title` | Phone access for {computer} is turned off in your Radient Console. | Truy cập từ điện thoại vào {computer} đang tắt trong bảng điều khiển Radient của bạn. | Truy cập từ điện thoại vào {computer} đang tắt trong Radient Console. | Only change vs prior catalogue: «bảng điều khiển Radient» → «Radient Console» (glossary §1: exact brand, no generic replacement); rest byte-identical. EN "your Radient Console": «của bạn» dropped. Accepted: vi style guide drops pronouns outside first contact/blocking decisions; «Radient Console của bạn» reads as owning the product itself; ownership is carried by {computer}. No meaning loss. |
| `mobile.refusal.open_console.title` | Phone access for {computer} needs a change in your Radient Console. | Truy cập từ điện thoại vào {computer} cần được điều chỉnh trong bảng điều khiển Radient của bạn. | Truy cập từ điện thoại vào {computer} cần được điều chỉnh trong Radient Console. | Only change vs prior catalogue: «bảng điều khiển Radient» → «Radient Console» (glossary §1: exact brand, no generic replacement); rest byte-identical. Same «của bạn» call as console_disabled.title; accepted. |
| `mobile.refusal.refused.body` | Check it in your Radient Console, or try again. | Hãy kiểm tra trong bảng điều khiển Radient, hoặc thử lại. | Hãy kiểm tra trong Radient Console, hoặc thử lại. | Only change vs prior catalogue: «bảng điều khiển Radient» → «Radient Console» (glossary §1: exact brand, no generic replacement); rest byte-identical. EN "your" not rendered; prior catalogue also omitted it. Accepted. |

## Cross-group calls
- «trong» vs «trên»: «trên» is common for web platforms, but «trong Radient Console» is idiomatic for acting inside a console, all 15 keys use «trong» consistently, and delete_help needs the contrast with «trên trình duyệt». Not a finding.
- No width hints in slice; buttons shrink (26 → 18 chars, «Mở Radient Console»). Latin-script locale: no bidi risk.
- Pre-existing deviations outside the brand change (console_next omits "there", adds «lại»; harness_help omits "harness"; manage_plan omits "your") are out of scope per brief non-goals and do not gate.

Ledger: not written — this run's brief says no edits/commits; manager records it.

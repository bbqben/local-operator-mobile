# Translation audit — vi · mobile.settings · Radient Console brand slice

Audit ID: rcvi-settin · Date: 2026-11-15 · Keys: 1
Auditor: i18n-auditor (team lopdev), session 8327197fa0aa, model anthropic/claude-opus-5-5 (no fallback observed). Translator session: 2a0b42cbac53 (independent). No MT service used.

## Verdict: passed — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT

## Mechanical
Placeholders identical to EN; `Radient Console` byte-exact (ASCII U+0020, capital R/C), count equal to EN per key; no residual «bảng điều khiển»; NFC; em dash spaced; key set equals en proposal. No plural/select (vi = `other` only). No repo validator applies to the flat scratch draft (mobile checkout HEAD d9b41018 has no src/i18n); checks run by auditor script — see audit.log.

## Per-key
| key | EN (proposed/override) | prior vi @0a629e65 | draft vi | judgement |
|---|---|---|---|---|
| `mobile.settings.account.delete_help` | Deleting your account happens in the Radient Console, in the browser — this app cannot do it for you. It deletes the account and every tunnel on it. Sessions on your computer are not touched. | Việc xóa tài khoản được thực hiện trong bảng điều khiển Radient trên trình duyệt — ứng dụng này không thể xóa giúp bạn. Thao tác này xóa tài khoản và mọi đường hầm thuộc tài khoản đó. Các phiên trên máy tính không bị ảnh hưởng. | Việc xóa tài khoản được thực hiện trong Radient Console trên trình duyệt — ứng dụng này không thể xóa giúp bạn. Thao tác này xóa tài khoản và mọi đường hầm thuộc tài khoản đó. Các phiên trên máy tính không bị ảnh hưởng. | Only change vs prior catalogue: «bảng điều khiển Radient» → «Radient Console» (glossary §1: exact brand, no generic replacement); rest byte-identical. «trong Radient Console trên trình duyệt» keeps trong (inside the console) distinct from trên (on the browser); «trên Radient Console» would stack two «trên». Destructive scope (account + every tunnel; sessions untouched) preserved. |

## Cross-group calls
- «trong» vs «trên»: «trên» is common for web platforms, but «trong Radient Console» is idiomatic for acting inside a console, all 15 keys use «trong» consistently, and delete_help needs the contrast with «trên trình duyệt». Not a finding.
- No width hints in slice; buttons shrink (26 → 18 chars, «Mở Radient Console»). Latin-script locale: no bidi risk.
- Pre-existing deviations outside the brand change (console_next omits "there", adds «lại»; harness_help omits "harness"; manage_plan omits "your") are out of scope per brief non-goals and do not gate.

Ledger: not written — this run's brief says no edits/commits; manager records it.

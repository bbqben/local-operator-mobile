# zh-CN — M3 S2c audit gap — round 2b (draft v2 delta) — independent audit

**Verdict: `passed`**: BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0. No open findings.

- Auditor: `i18n-auditor`, session `ee8652d4b9ec`, model `anthropic/claude-opus-5-5` (from the session header; no fallback). Independent of the translator (61bbc0d54f8c) and the round-1 auditor (d37012778437). No MT service used. Read-only; no ledger row written.
- Draft v2 sha256 `3cd14eed…eae1035`, verified at the lane path and in this auditor's scratch copy.

## Delta
- v1 and v2 have the same 36 keys. 34 values are byte-identical. Only `mobile.refusal.offline.body` and `mobile.refusal.relay_stopped.body` changed.
- **zh-CN-GAP-R2-1:** resolved. `offline.body` now reads 请唤醒那台电脑，并确认其上已打开Local Operator。, which is the suggested wording.
- **zh-CN-GAP-R2-2:** resolved. `relay_stopped.body` now reads 请在那台电脑上打开它，然后轻点“重试”。, which is the suggested wording.

## Checks on the final 66 keys
- **Placeholders:** checked with the repo's `parseMessage` (`9214ff9b`). 66/66 match en; 13 keys have parameters. Negative controls: a renamed placeholder was detected, and an unclosed brace threw.
- **Spacing and punctuation:** 0 Han–space–Latin runs, 0 bidi chars, 0 single ellipsis, 0 ASCII punctuation next to Han.
- **Wording:** identical English always gets identical zh.
- **Deixis:** every refusal body that points at the remote computer now says 那台电脑. The remaining 这台电脑 values all translate English "this computer".

The round-1 and round-2 dispositions carry forward unchanged.

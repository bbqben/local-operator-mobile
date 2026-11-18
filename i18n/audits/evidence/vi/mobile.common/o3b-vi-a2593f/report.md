# O3-b audit — vi / mobile.common — o3b-vi-a2593f

Verdict: **passed** · unresolved BLOCKER/MAJOR: 0 · keys: 2
Auditor: i18n-auditor (team lopdev), session a2593f163587, model anthropic/claude-opus-5-5 (harness 'Model:' line; no fallback). Translator session 9bc4a4716d1c, so this audit is independent.
Inputs: draft sha256 9bb41ba8…1333 (source commit 39b5e3e5); brief sha256 63351e7e…ddfe; vi style guide e4901497…; glossary 0eb34437…
Mechanical (see audit.log): key set equal (40/40 overall); placeholder sets equal; every value parses with the repo's parseMessage; plural arms are `other` only, which is the full CLDR set for vi; NFC; no ASCII "..."; redaction hits: 0 in the draft. The brief's own `redaction_scan.pattern` field matched itself twice and was excluded.

## Judgement
Both keys correct, idiomatic, within width (Đóng 4/12, Đang tải 8/16). No findings.

## Findings
None.
## Keys audited (rendered length / width hint)
| key | en | vi | len |
|---|---|---|---|
| `mobile.common.close` | Close | Đóng | 4/12 |
| `mobile.common.loading` | Loading | Đang tải | 8/16 |

_report.md holds the auditor's notes, not an execution log; audit.log holds the commands that were run and their output._

# zh-CN audit — mobile.team_bridge — Radient Console brand slice (2 keys)

- Audit id: zhrc-tb · date 2026-11-15 · auditor: i18n-auditor, session 892a29d53eba, model anthropic/claude-opus-5-5 (session system-prompt header; no fallback). Independent of translator session 5a50d6607347.
- Draft sha256 e81c22873482cde52d96e854e4b4fde8c99cc5725bb489e19057496d131a0492; glossary 56662d28 · style guide 633c9bbd (FINAL).
- **Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0

## Keys audited

- `mobile.team_bridge.gate.console_error`: 无法打开Radient Console。
- `mobile.team_bridge.gate.manage_plan`: 在Radient Console中管理套餐

## Mechanical

Checks run (see audit.log): the draft's 15 keys equal the brief's keys. The current zh-CN values at mobile 0a629e65 match brief.current and its sha256 (15/15). Placeholder sets are identical to the proposed en (with the attach_help override). "Radient Console" appears exactly once wherever en has it, written with U+0020. There is no 控制台 anywhere in the overlaid zh-CN set. There is no space between CJK and Latin runs and no half-width punctuation after CJK. All values are NFC. The repo validator `node scripts/i18n/generate.ts` and `--check` both exit 0 on a scratch git-archive of 0a629e65 with the draft and proposed en overlaid. No plurals in the slice.

## Judgement

Per-key judgement:
- gate.console_error (status): 无法打开Radient Console。 is accurate. The stray spaces from the current value are removed, as the style guide requires. The trailing 。 predates this slice and matches en.
- gate.manage_plan: 在Radient Console中管理套餐. 套餐 matches gate.plan_required. 你的 is dropped per l.63–64. It works as a link-style label, so no 请 — correct. Adding 中 after the Latin brand is an improvement.
No findings.

## Findings

None.

Not claimed: no rendered-frame check, no native-speaker human review, and no ledger row written (the brief says no edits/commits).

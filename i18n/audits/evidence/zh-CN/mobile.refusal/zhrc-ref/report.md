# zh-CN audit — mobile.refusal — Radient Console brand slice (4 keys)

- Audit id: zhrc-ref · date 2026-11-15 · auditor: i18n-auditor, session 892a29d53eba, model anthropic/claude-opus-5-5 (session system-prompt header; no fallback). Independent of translator session 5a50d6607347.
- Draft sha256 e81c22873482cde52d96e854e4b4fde8c99cc5725bb489e19057496d131a0492; glossary 56662d28 · style guide 633c9bbd (FINAL).
- **Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0

## Keys audited

- `mobile.refusal.action.open_console`: 打开Radient Console
- `mobile.refusal.console_disabled.title`: {computer}的手机访问已在Radient Console中关闭。
- `mobile.refusal.open_console.title`: {computer}的手机访问需要在Radient Console中进行更改。
- `mobile.refusal.refused.body`: 请在Radient Console中查看，或重试。

## Mechanical

Checks run (see audit.log): the draft's 15 keys equal the brief's keys. The current zh-CN values at mobile 0a629e65 match brief.current and its sha256 (15/15). Placeholder sets are identical to the proposed en (with the attach_help override). "Radient Console" appears exactly once wherever en has it, written with U+0020. There is no 控制台 anywhere in the overlaid zh-CN set. There is no space between CJK and Latin runs and no half-width punctuation after CJK. All values are NFC. The repo validator `node scripts/i18n/generate.ts` and `--check` both exit 0 on a scratch git-archive of 0a629e65 with the draft and proposed en overlaid. No plurals in the slice.

## Judgement

Per-key judgement:
- action.open_console (button): 17 chars / 19 cells. No 请 and no 。 — correct.
- console_disabled.title, open_console.title: dropping 你的 follows style guide l.63–64 (pronoun drop). These are single-sentence headings, so no 请 — correct. 手机访问 matches the rest of the namespace (phone_access_off, suspended, tunnel_gone). open_console.title (需要在…中进行更改) is slightly formulaic, but the phrasing predates this slice and is not wrong. Not raised.
- refused.body: 请 at the head, 或重试 chained. Accurate.
No findings.

## Findings

None.

Not claimed: no rendered-frame check, no native-speaker human review, and no ledger row written (the brief says no edits/commits).

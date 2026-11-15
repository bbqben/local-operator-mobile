# zh-CN audit — mobile.settings — Radient Console brand slice (1 keys)

- Audit id: zhrc-set · date 2026-11-15 · auditor: i18n-auditor, session 892a29d53eba, model anthropic/claude-opus-5-5 (session system-prompt header; no fallback). Independent of translator session 5a50d6607347.
- Draft sha256 e81c22873482cde52d96e854e4b4fde8c99cc5725bb489e19057496d131a0492; glossary 56662d28 · style guide 633c9bbd (FINAL).
- **Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0

## Keys audited

- `mobile.settings.account.delete_help`: 删除账户需在浏览器中通过Radient Console操作，本应用无法代为删除。此操作会删除账户及其所有隧道，不会影响电脑上的会话。

## Mechanical

Checks run (see audit.log): the draft's 15 keys equal the brief's keys. The current zh-CN values at mobile 0a629e65 match brief.current and its sha256 (15/15). Placeholder sets are identical to the proposed en (with the attach_help override). "Radient Console" appears exactly once wherever en has it, written with U+0020. There is no 控制台 anywhere in the overlaid zh-CN set. There is no space between CJK and Latin runs and no half-width punctuation after CJK. All values are NFC. The repo validator `node scripts/i18n/generate.ts` and `--check` both exit 0 on a scratch git-archive of 0a629e65 with the draft and proposed en overlaid. No plurals in the slice.

## Judgement

Per-key judgement:
- account.delete_help: 通过Radient Console操作 is the natural fix once the brand is a Latin run. 在浏览器中的…操作 would leave a dangling locative. The destructive scope is exact: the account and all its tunnels are deleted, and sessions on the computer are not affected. 本应用无法代为删除 renders "this app cannot do it for you". It is a statement, so no 请 — correct.
No findings.

## Findings

None.

Not claimed: no rendered-frame check, no native-speaker human review, and no ledger row written (the brief says no edits/commits).

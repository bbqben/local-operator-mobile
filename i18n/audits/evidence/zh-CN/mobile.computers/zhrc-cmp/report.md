# zh-CN audit — mobile.computers — Radient Console brand slice (8 keys)

- Audit id: zhrc-cmp · date 2026-11-15 · auditor: i18n-auditor, session 892a29d53eba, model anthropic/claude-opus-5-5 (session system-prompt header; no fallback). Independent of translator session 5a50d6607347.
- Draft sha256 e81c22873482cde52d96e854e4b4fde8c99cc5725bb489e19057496d131a0492; glossary 56662d28 · style guide 633c9bbd (FINAL).
- **Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 1 · NIT 1

## Keys audited

- `mobile.computers.billing_help`: 请在Radient Console中打开此隧道的账单设置，并启用远程访问。
- `mobile.computers.disabled_help`: Radient显示此隧道当前未处于活动状态。请在Radient Console中检查其状态。
- `mobile.computers.harness_help`: 请在Radient Console中为此隧道启用Local Operator。
- `mobile.computers.refusal.console_next`: 请打开Radient Console进行处理。在此手机上重新登录也无法解决这个问题。
- `mobile.computers.refusal.open_console`: 打开Radient Console
- `mobile.computers.route_invalid.not_radient`: 这不是Radient隧道地址。请使用Radient Console为此电脑显示的地址。
- `mobile.computers.setup.amount_note`: {amount}是Radient Console为此账户显示的价格——{command}不接受其他金额；隧道指南第1步提供了查看价格的链接。
- `mobile.computers.setup.attach_help`: 如果你是在Radient Console中创建的隧道，请使用其中显示的ID关联它。此命令仅适用于已存在的隧道——它不会新建隧道。

## Mechanical

Checks run (see audit.log): the draft's 15 keys equal the brief's keys. The current zh-CN values at mobile 0a629e65 match brief.current and its sha256 (15/15). Placeholder sets are identical to the proposed en (with the attach_help override). "Radient Console" appears exactly once wherever en has it, written with U+0020. There is no 控制台 anywhere in the overlaid zh-CN set. There is no space between CJK and Latin runs and no half-width punctuation after CJK. All values are NFC. The repo validator `node scripts/i18n/generate.ts` and `--check` both exit 0 on a scratch git-archive of 0a629e65 with the draft and proposed en overlaid. No plurals in the slice.

## Judgement

Per-key judgement:
- billing_help, harness_help: the added 请 sits at the head of the first remedy clause and governs the chained verb (，并启用). This is correct per style guide l.16–35 and consistent with the neighbouring 请-led remedy bodies.
- disabled_help, route_invalid.not_radient: accurate. Moving to 在…中检查 after the Latin brand reads naturally.
- harness_help: drops "harness". Not counted as a finding, because mobile.computers.not_harness drops it the same way and the glossary has no zh-CN term for harness. Meaning is kept: the reader enables Local Operator.
- refusal.open_console (button): 打开Radient Console is 17 chars / 19 cells against the en note's "~24 characters". No 请 and no 。 — correct.
- setup.amount_note: accurate. The —— and ；are correct and the placeholders are intact. It is a statement, so no 请 — correct.
- setup.attach_help: matches the override English (attach by the id shown there; will not create one). 关联 matches attach_title/attach_label. See ZRC-01.
- refusal.console_next: see ZRC-02.

## Findings

### ZRC-01 — MINOR — `mobile.computers.setup.attach_help`
- Current: 如果你是在Radient Console中创建的隧道，请使用其中显示的ID关联它。…
- Problem: 其中 most often reads as "among them/of which" (其中一个); here it has to reach back past 创建的隧道 to 在Radient Console中, so a reader may briefly parse "the ID shown in the tunnel". The catalogue renders English "there" as 那里 elsewhere (notifications.permission.denied 请在那里开启; signin.panel.waiting_help 在那里完成登录). Meaning is recoverable, so this is MINOR.
- Suggested: 如果你是在Radient Console中创建的隧道，请使用那里显示的ID关联它。此命令仅适用于已存在的隧道——它不会新建隧道。

### ZRC-02 — NIT — `mobile.computers.refusal.console_next`
- Current: …在此手机上重新登录也无法解决这个问题。
- Problem: The English says "Signing in on this phone", not "signing in again", so 重新 is an addition. The sibling refusal (mobile.refusal.computer_sign_in.body) renders the same sentence as 在此手机上登录并不能解决问题。 This wording predates the slice; the key was touched, so it is worth aligning.
- Suggested: 请打开Radient Console进行处理。在此手机上登录并不能解决问题。


Not claimed: no rendered-frame check, no native-speaker human review, and no ledger row written (the brief says no edits/commits).


## Addendum — round 2 (2026-11-15, same auditor/session/model)

- Scope: only `mobile.computers.setup.attach_help`, plus a check that the other 14 values are unchanged. New draft sha256 56755005ae75ff54482778c026beb0e9eef85d23fa2bcffa6dc832f8425ddb55; round 1 audited e81c22873482….
- attach_help now reads 如果你是在Radient Console中创建的隧道，请使用那里显示的ID关联它。此命令仅适用于已存在的隧道——它不会新建隧道。 It is byte-equal to the ZRC-01 suggestion. Brand ×1, 控制台 0, 其中 0, one 请 at the clause head, no CJK–Latin space, NFC. **ZRC-01: fixed.**
- The other 14 values are byte-identical (UTF-8) to the round-1 audited values. Caveat: the round-1 draft file was overwritten, so its values were taken from the four round-1 report.md key lists. Those lists were generated from that draft in the round-1 run.
- ZRC-02 (NIT, pre-existing wording): **deferred** by the manager.
- Verdict: **passed**. BLOCKER 0 · MAJOR 0 · open MINOR 0 · NIT 1 (deferred).

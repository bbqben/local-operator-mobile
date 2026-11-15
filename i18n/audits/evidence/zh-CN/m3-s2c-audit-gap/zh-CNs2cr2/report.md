# zh-CN — M3 S2c audit gap — round 2 (remediation draft) — independent audit

**Verdict: `passed`** — BLOCKER 0 · MAJOR 0 · MINOR 1 · NIT 1.

- Auditor `i18n-auditor`, session `ee8652d4b9ec`, model `anthropic/claude-opus-5-5` (session header; no fallback). Not the translator (61bbc0d54f8c) and not the round-1 auditor (d37012778437). No MT service used; read-only on all repos; no ledger row written (the lane owner records it).
- Inputs (sha256 checked before use, all matched): brief `30da9470…edbda5`, draft `c41ad98f…eb13eb`, round-1 record/report, translator notes. Shipped catalogues at `9214ff9b`: brief values == shipped for all 66 keys. Style guide: `~/local-operator origin/main:i18n/style-guides/zh-CN.md`. Desktop labels: `~/local-operator-ui origin/main e612221450`.

## Checks
1. **Round-1 resolution:** GAP-1…9 applied (GAP-5 brings a new MINOR, below). GAP-10 rejection is **sound**: every one of the 72 shipped zh-CN mobile values that contains 请 translates English that has no "please". So the house pattern is uniform, and dropping 请 only in the refusal bodies would break it. The style-guide line ("请 only where English says please") no longer matches practice. That is a guide-maintenance point for the lane owner, not a translation defect.
2. **Scope:** 36 draft keys, all in the brief and all flagged in round 1 (31 GAP-1 + 5 more). 13 keys change more than whitespace, and each change traces to a finding. `tunnel_gone.body` is justified in the notes.
3. **Placeholders:** checked with the repo's `parseMessage` (node v24 type-strip, `env -i`, isolated HOME, 256 MB heap). 66/66 final values have the same `{name: kind}` set as en; 13 have parameters. Negative controls: renaming `{computer}` → `{computr}` was detected, and the unclosed `{computer处于休眠状态` threw a RangeError.
4. **Final 66 consistency:** 0 Han–space–Latin/placeholder runs, 0 bidi/format chars, 0 single `…`, 0 ASCII punctuation next to Han, 0 `[redacted]`. Identical English gets identical zh across the 66. Tap verb is only 轻点 and phone is only 此手机; 休眠 is the only word for asleep. The quoted “重试” matches `mobile.refusal.action.retry`. “设置手机访问”, the path `设置 → Radient账户 → 手机访问`, 重新检查 and 打开Radient控制台 all match the desktop labels. RTL n/a.
5. **Judgements asked for:**
   - GAP-10 rejection (keep 请): accepted, for the reason in check 1.
   - Extra 请 in `relay_stopped.body`: accepted. It aligns with the sibling bodies (suspended, relay_refused, computer_attention).
   - `tunnel_gone.body` → 请在Local Operator中开启：设置 → Radient账户 → 手机访问。: accepted. The meaning is preserved, a colon before a menu path is idiomatic UI copy, and it avoids the 手机访问中开启 fusion that de-spacing would cause. 开启 is the right verb for re-enabling.

## Findings
| ID | Sev | Key | Current | Suggested | Reason |
|---|---|---|---|---|---|
| zh-CN-GAP-R2-1 | MINOR (new, from GAP-5 fix) | `mobile.refusal.offline.body` | 请唤醒这台电脑，并确认已在电脑上打开Local Operator。 | 请唤醒那台电脑，并确认其上已打开Local Operator。 | The reader is on the phone and the computer is remote. The shipped analogue `mobile.computers.refusal.offline_next` says 请唤醒那台电脑, and the sibling bodies use 那台电脑. 这台 is proximal, and 电脑 appears twice in a short sentence. Not gating, because the title names `{computer}`. |
| zh-CN-GAP-R2-2 | NIT | `mobile.refusal.relay_stopped.body` | 请在电脑上打开它，然后轻点“重试”。 | 请在那台电脑上打开它，然后轻点“重试”。 | English "there" is 在那台电脑上 in relay_refused, computer_sign_in and computer_attention bodies. |

Not raised (pre-existing, outside the draft): 点按 in `mobile.composer_input.paste.denied`; `how_to.title` 开通手机访问 vs `mobile.home.suggestion.phone_access` 开启手机访问 (round 1 accepted the 开通/开启 split); Han–Latin spaces in other namespaces.

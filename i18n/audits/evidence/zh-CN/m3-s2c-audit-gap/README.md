# zh-CN — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 36 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `zh-CNs2c` | `m3gap/audits/zh-CN/record.json` | `record.json` | `35f82d55aa274dd7ecd809e4bc752b40b85c91b165b76d8138e79461f662fecc` |
| `zh-CNs2c` | `m3gap/audits/zh-CN/report.md` | `report.md` | `df045613b02cd0f963bcf0fa315a3084feed56a4736dc6f6a83afce5b253a581` |
| `zh-CNs2c` | `m3gap/audits/zh-CN/audit.log` | `audit.log` | `00868474154ee9c1af7d9a9538c0ce30434e92601e15c7c2e9398d1a2313fc9a` |
| `zh-CNs2cr2` | `m3gap/audits-r2/zh-CN/record.json` | `record.json` | `d3729280e0b92ff18e1f806d2239b02d90478c46122bc38d2a82d69b3d07b7c2` |
| `zh-CNs2cr2` | `m3gap/audits-r2/zh-CN/report.md` | `report.md` | `175fff9c85ff36130a810353f1581b27bc0e44a4662c1dcbbd51d772609fdb9a` |
| `zh-CNs2cr2` | `m3gap/audits-r2/zh-CN/audit.log` | `audit.log` | `250da06e5d55b51a86ec5b08dadfb11ef3451022fd5daa7865c9336ea231c619` |
| `zh-CNs2cr2b` | `m3gap/audits-r2/zh-CN/record-r2b.json` | `record.json` | `981e4b3b7108d6616080d0af3eb901243ccd8b95d102e3132b15d32244488815` |
| `zh-CNs2cr2b` | `m3gap/audits-r2/zh-CN/report-r2b.md` | `report.md` | `c5375744a7bd8284980ef378140af60ea1613278e454a6bf8548fac057de8644` |
| `zh-CNs2cr2b` | `m3gap/audits-r2/zh-CN/audit-r2b.log` | `audit.log` | `9249a68bd4da0020f3f37caa451307c80c0db1acdd8d0b5d3dc363d22184c4f6` |

Round 2b was written beside round 2 under `-r2b` names; it is stored under the ordinary names in its own directory:

- `m3gap/audits-r2/zh-CN/record-r2b.json` → `zh-CNs2cr2b/record.json`
- `m3gap/audits-r2/zh-CN/report-r2b.md` → `zh-CNs2cr2b/report.md`
- `m3gap/audits-r2/zh-CN/audit-r2b.log` → `zh-CNs2cr2b/audit.log`

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `61bbc0d54f8c`, as recorded in the round-2 `record.json`.
- Draft v1 sha256 (audited in round 2): `c41ad98ff0061f17873886322ebb0498015f2ae7a7cd674db6359aed7feb13eb`.
- Draft v2 sha256 (applied): `3cd14eed0642a19711ac0d88a6812447471b808cac66949fc671666aeaae1035`; it is the draft named in `zh-CNs2cr2b/record.json` inputs.
- Applied: 36 values, `mobile.computers` 4, `mobile.notifications` 1, `mobile.refusal` 30, `mobile.settings` 1. Keys outside the brief: none.
- `zh-CNs2c` (round 1): auditor session `d37012778437`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 5 MINOR, 5 NIT).
- `zh-CNs2cr2` (round 2): auditor session `ee8652d4b9ec`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 1 MINOR, 1 NIT).
- `zh-CNs2cr2b` (round 2b, the final verdict): auditor session `ee8652d4b9ec`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
- Every round's `record.json` records an auditor session independent of the translator session; the round-2 record also records independence from the round-1 session.

## Route and review

- Route: ordinary git and scratchpad reads. `read_public_copy` was not used: core refuses mobile catalogue paths. The context sidecars are nested JSON and not routable through it.
- Native-speaker review: waived by the operator. The independent LLM audit rounds above were done instead.
- `zh-CNs2c/report.md`, `zh-CNs2cr2/report.md`, `zh-CNs2cr2/audit.log` contain the literal `[redacted]` string only as the auditor's own check that no redaction marker reached the brief or drafts (it found none). It is not a redacted value.

## Left to the next slice (code, not catalogue)

- The English "Your computer" fallback on the transient-notice path: `src/features/auth/connection-provider.tsx` (~line 2634, the `transient` memo) passes a literal English `"Your computer"` into `transientCopy(..., subject)` when no computer is named, so the transient notice shows English inside a translated sentence. The refusal path (~line 2597) already resolves `t("mobile.computers.your_computer")`. A code change, not a catalogue one. (The `"Radient"` subject at ~line 2595 is the product name, identical in every locale by design.)
- ur alert-title direction (`ur-C1`): the refusal alert title's base direction is a code item.

## Out-of-batch follow-ups the auditors listed

- es: 7 keys with «ordenador» and 3 `mobile.notifications.permission.*` keys with «computadoras» (10 keys outside this batch)
- hi `mobile.signin.diagnostics` निदान
- vi "bảng điều khiển Radient" vs desktop "Radient Console"
- ur `mobile.home.suggestion.phone_access` glossary
- zh-CN style-guide 请 rule

## Applied values (durable)

`applied-values.json` holds the exact value of every key this PR changed in `zh-CN`, derived by script from this PR's head catalogues, beside the draft sha256 it was applied from — so "applied == audited" can be checked from the repository alone, without the lane's scratchpad. sha256 `cc19ec0b620cb3c525a885041e1010f11f6c69df233b54a60d21edefb5802278`. Re-check: every `values[k].value` equals the catalogue value at `values[k].file`, and equals the audited draft.

## Record schema note

The auditors' `record.json` files are committed byte-identical and are not normalised here. Their shapes differ: most use `counts: {BLOCKER, MAJOR, MINOR, NIT}` and `verdict: "passed"|"failed"`; `rus2cr2` uses lowercase `counts` keys (`blocker`, `major`, …) with extra fields, and `rus2cr2` / `zh-CNs2cr2` carry `verdict` as an object (`verdict.status`). Read the verdict as `verdict.status` when `verdict` is an object, and compare count keys case-insensitively.

# fr — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 14 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `frs2c` | `m3gap/audits/fr/record.json` | `record.json` | `92708299cbfccd0d50d0e255783fb746d1fe4aded56fd6d85e75dedcba929350` |
| `frs2c` | `m3gap/audits/fr/report.md` | `report.md` | `77a9eeecd4675c59b702453ba95e5507c799843e256898f59181da0cdbf62297` |
| `frs2c` | `m3gap/audits/fr/audit.log` | `audit.log` | `77c72e64262cf5b8412d5126d218d64593bd2b6ed773b11cc84084c3dc8b26bd` |
| `frs2cr2` | `m3gap/audits-r2/fr/record.json` | `record.json` | `417cb1cbff6b2a7294fd4709f6b3ac96bef1deb6530ca3a581bebec2638261ef` |
| `frs2cr2` | `m3gap/audits-r2/fr/report.md` | `report.md` | `1899a89c404763d629c742ab955ebcb86ecbe683557024f68e5e5e9ec074846f` |
| `frs2cr2` | `m3gap/audits-r2/fr/audit.log` | `audit.log` | `559426e3811c6d79a5e07ca23faae743f0fce021645f817b6b523f64f16a87bf` |
| `frs2cr2b` | `m3gap/audits-r2/fr/record-r2b.json` | `record.json` | `4b91cc0cd394e150f6eee2411b2a8b4511544af3b605a1ebb4f10af096a3b954` |
| `frs2cr2b` | `m3gap/audits-r2/fr/report-r2b.md` | `report.md` | `3fe3b1ccf291db2fa0b32e211073d16c45c23bb283a8730ad83b92fcd864b8b2` |
| `frs2cr2b` | `m3gap/audits-r2/fr/audit-r2b.log` | `audit.log` | `07ec12e1096d45fac0f0f5aeb3a0010d1eec4b06a75e353515e5f84606230743` |

Round 2b was written beside round 2 under `-r2b` names; it is stored under the ordinary names in its own directory:

- `m3gap/audits-r2/fr/record-r2b.json` → `frs2cr2b/record.json`
- `m3gap/audits-r2/fr/report-r2b.md` → `frs2cr2b/report.md`
- `m3gap/audits-r2/fr/audit-r2b.log` → `frs2cr2b/audit.log`

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `70879ee98b8d`, as recorded in the round-2 `record.json`.
- Draft v1 sha256 (audited in round 2): `7c73ad99d3d27494cb9432b74a77e4d7e09d255082b5c7aacf45d1f978320d6b`.
- Draft v2 sha256 (applied): `26d45acf6684e1709b408cec7a6451c01365f6dc1c0641774bb0c7ca7771d317`; it is the draft named in `frs2cr2b/record.json` inputs.
- Applied: 14 values, `mobile.home` 1, `mobile.notifications` 1, `mobile.refusal` 10, `mobile.settings` 2. Keys outside the brief: `mobile.home.suggestion.phone_access` (requested by the manager; its main value equalled the `9214ff9b` value).
- `frs2c` (round 1): auditor session `796f6be72d5f`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 6 MAJOR, 4 MINOR, 3 NIT).
- `frs2cr2` (round 2): auditor session `b27f79fca9d4`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 1 MAJOR, 0 MINOR, 0 NIT).
- `frs2cr2b` (round 2b, the final verdict): auditor session `b27f79fca9d4`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
- Every round's `record.json` records an auditor session independent of the translator session; the round-2 record also records independence from the round-1 session.

## Route and review

- Route: ordinary git and scratchpad reads. `read_public_copy` was not used: core refuses mobile catalogue paths. The context sidecars are nested JSON and not routable through it.
- Native-speaker review: waived by the operator. The independent LLM audit rounds above were done instead.
- `frs2c/audit.log` contains the literal `[redacted]` string only as the auditor's own check that no redaction marker reached the brief or drafts (it found none). It is not a redacted value.

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

`applied-values.json` holds the exact value of every key this PR changed in `fr`, derived by script from this PR's head catalogues, beside the draft sha256 it was applied from — so "applied == audited" can be checked from the repository alone, without the lane's scratchpad. sha256 `d1977fcd25bef2b4a9918d368f6298b1aedda2f68e22594167bf94f60b8f32bd`. Re-check: every `values[k].value` equals the catalogue value at `values[k].file`, and equals the audited draft.

## Record schema note

The auditors' `record.json` files are committed byte-identical and are not normalised here. Their shapes differ: most use `counts: {BLOCKER, MAJOR, MINOR, NIT}` and `verdict: "passed"|"failed"`; `rus2cr2` uses lowercase `counts` keys (`blocker`, `major`, …) with extra fields, and `rus2cr2` / `zh-CNs2cr2` carry `verdict` as an object (`verdict.status`). Read the verdict as `verdict.status` when `verdict` is an object, and compare count keys case-insensitively.

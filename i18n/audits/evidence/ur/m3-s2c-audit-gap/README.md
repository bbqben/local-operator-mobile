# ur — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 16 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `urs2c` | `m3gap/audits/ur/record.json` | `record.json` | `e59ccc092f48552d718cb737b26bbc729fcbadf9aff760e4980830601e9d086e` |
| `urs2c` | `m3gap/audits/ur/report.md` | `report.md` | `7b56b638b31d6290abddbf7e8059a4c56d59df26ccf17eabfb7e3d1a870a88e0` |
| `urs2c` | `m3gap/audits/ur/audit.log` | `audit.log` | `fe9413974521e712f83efb5d150f2161974224d2adc4a3c4bc56559f399f8719` |
| `urs2cr2` | `m3gap/audits-r2/ur/record.json` | `record.json` | `bc50cc9dcb52d3ce6588ae114b1687db2fa3ae9468313a3940522d9ec929652c` |
| `urs2cr2` | `m3gap/audits-r2/ur/report.md` | `report.md` | `9fa1b494d7cd6badda86e1c4d7ca865c5fae76b6a035497be87f4062e7c4ba3d` |
| `urs2cr2` | `m3gap/audits-r2/ur/audit.log` | `audit.log` | `15e7b50a44ce5967bd89f0f9776d0ac930c8fc8ebb72e535484fa6e2f811890d` |

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `4ccb027fe9ed`, as recorded in the round-2 `record.json`.
- Draft sha256 (applied): `a107e8d2f2a7ed7bcbda67e5215894573c8db5bcb57e35db5f157f5c5c47c6a0`; it is the draft named in `urs2cr2/record.json` inputs.
- Applied: 16 values, `mobile.computers` 3, `mobile.refusal` 10, `mobile.settings` 3. Keys outside the brief: none.
- `urs2c` (round 1): auditor session `6ce4c67b2038`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 3 MAJOR, 4 MINOR, 4 NIT).
- `urs2cr2` (round 2): auditor session `2e68665fe1be`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 1 NIT).
- Every round's `record.json` records an auditor session independent of the translator session; the round-2 record also records independence from the round-1 session.

## Route and review

- Route: ordinary git and scratchpad reads. `read_public_copy` was not used: core refuses mobile catalogue paths. The context sidecars are nested JSON and not routable through it.
- Native-speaker review: waived by the operator. The independent LLM audit rounds above were done instead.

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

`applied-values.json` holds the exact value of every key this PR changed in `ur`, derived by script from this PR's head catalogues, beside the draft sha256 it was applied from — so "applied == audited" can be checked from the repository alone, without the lane's scratchpad. sha256 `8a0487f95eee01e4625b53ccf6e68d6a7ccd5f89c1f7733f95e913b18c32d7ae`. Re-check: every `values[k].value` equals the catalogue value at `values[k].file`, and equals the audited draft.

## Record schema note

The auditors' `record.json` files are committed byte-identical and are not normalised here. Their shapes differ: most use `counts: {BLOCKER, MAJOR, MINOR, NIT}` and `verdict: "passed"|"failed"`; `rus2cr2` uses lowercase `counts` keys (`blocker`, `major`, …) with extra fields, and `rus2cr2` / `zh-CNs2cr2` carry `verdict` as an object (`verdict.status`). Read the verdict as `verdict.status` when `verdict` is an object, and compare count keys case-insensitively.

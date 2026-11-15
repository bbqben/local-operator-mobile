# es — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 18 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `ess2c` | `m3gap/audits/es/record.json` | `record.json` | `2752516bb264408435e53c1f5a1ca19b058f24202e7dd3a3195105597128544f` |
| `ess2c` | `m3gap/audits/es/report.md` | `report.md` | `330f71a0330aa264b9133685be321211006299282310824c9431d78440e12102` |
| `ess2c` | `m3gap/audits/es/audit.log` | `audit.log` | `fe1e62a4e0afd799fb5ef7fe3b6683683c720191ed3bd1693077d7a6b6bb4d3e` |
| `ess2cr2` | `m3gap/audits-r2/es/record.json` | `record.json` | `018a83dc1bc87c0d360ea82a945ff4ef6ca85c9adc939a5fb1d6c9e26c52ac06` |
| `ess2cr2` | `m3gap/audits-r2/es/report.md` | `report.md` | `c343780e09aad1bd8afddac757366573a77a40a3a4e96105057becb9f3466b2f` |
| `ess2cr2` | `m3gap/audits-r2/es/audit.log` | `audit.log` | `9a8f15cb965f922b490d8577f2c1352272b6e40f6c67f0687c8ac137e34d73f0` |

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `442191ede748`, as recorded in the round-2 `record.json`.
- Draft sha256 (applied): `df6cb5a5537fc97849013b0dd4707955d66ba446d3a61465c84d1fe91ed6f6c2`; it is the draft named in `ess2cr2/record.json` inputs.
- Applied: 18 values, `mobile.computers` 1, `mobile.notifications` 6, `mobile.refusal` 10, `mobile.settings` 1. Keys outside the brief: none.
- `ess2c` (round 1): auditor session `37fe02cf811a`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 1 MAJOR, 4 MINOR, 2 NIT).
- `ess2cr2` (round 2): auditor session `00bdf32c5ccb`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
- Every round's `record.json` records an auditor session independent of the translator session; the round-2 record also records independence from the round-1 session.

## Route and review

- Route: ordinary git and scratchpad reads. `read_public_copy` was not used: core refuses mobile catalogue paths. The context sidecars are nested JSON and not routable through it.
- Native-speaker review: waived by the operator. The independent LLM audit rounds above were done instead.

## Left to the next slice (code, not catalogue)

- The English "Your computer" / "Radient" fallback interpolated into `{computer}`: `src/features/auth/connection-provider.tsx` passes a literal English `"Your computer"` (and the product name `"Radient"`) into the refusal headlines on some paths, beside the catalogue's `mobile.computers.your_computer`. A code change, not a catalogue one.
- ur alert-title direction (`ur-C1`): the refusal alert title's base direction is a code item.

## Out-of-batch follow-ups the auditors listed

- es «ordenador» in 10 other keys
- hi `mobile.signin.diagnostics` निदान
- vi "bảng điều khiển Radient" vs desktop "Radient Console"
- ur `mobile.home.suggestion.phone_access` glossary
- zh-CN style-guide 请 rule

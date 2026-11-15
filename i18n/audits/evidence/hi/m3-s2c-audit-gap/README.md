# hi — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 8 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `his2c` | `m3gap/audits/hi/record.json` | `record.json` | `d1e297eec3e9c5741e8d94fc848d31804332085b27f8910ca7bd9d2a501255c2` |
| `his2c` | `m3gap/audits/hi/report.md` | `report.md` | `b70e7946089d0319feaaad03544a16c0d3e011c11b16c93aaf552b49fe360d4b` |
| `his2c` | `m3gap/audits/hi/audit.log` | `audit.log` | `906d9251b38d68a56547e38d7029e501a2c928d0bfa4b73bd712ad2ec002bac9` |
| `his2cr2` | `m3gap/audits-r2/hi/record.json` | `record.json` | `2b29c107c55613b0784200b6ca355e06a84d9a9620960236f2a68551be7ce80e` |
| `his2cr2` | `m3gap/audits-r2/hi/report.md` | `report.md` | `a9c977edcae80ca8dd0b8581b499fdd20e5e1f34586e6f2945a863d8f8dc47f2` |
| `his2cr2` | `m3gap/audits-r2/hi/audit.log` | `audit.log` | `a955a44ef6ec61764df344514e737d5c20024933bb82e20fc8c12ebf3797034e` |

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `f932d8b2ca5f`, as recorded in the round-2 `record.json`.
- Draft sha256 (applied): `ff2bab4316698f1ae380b88f6c83da4f1e8cc183d619920a57d63466c92e40fb`; it is the draft named in `his2cr2/record.json` inputs.
- Applied: 8 values, `mobile.refusal` 4, `mobile.settings` 4. Keys outside the brief: `mobile.settings.section.diagnostics` (its main value equalled the `9214ff9b` value).
- `his2c` (round 1): auditor session `b61aea064bef`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 3 MINOR, 3 NIT).
- `his2cr2` (round 2): auditor session `db7521df8c9d`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 1 MINOR, 1 NIT).
- Every round's `record.json` records an auditor session independent of the translator session; the round-2 record also records independence from the round-1 session.

## Route and review

- Route: ordinary git and scratchpad reads. `read_public_copy` was not used: core refuses mobile catalogue paths. The context sidecars are nested JSON and not routable through it.
- Native-speaker review: waived by the operator. The independent LLM audit rounds above were done instead.
- `his2c/report.md`, `his2c/audit.log` contain the literal `[redacted]` string only as the auditor's own check that no redaction marker reached the brief or drafts (it found none). It is not a redacted value.

## Left to the next slice (code, not catalogue)

- The English "Your computer" / "Radient" fallback interpolated into `{computer}`: `src/features/auth/connection-provider.tsx` passes a literal English `"Your computer"` (and the product name `"Radient"`) into the refusal headlines on some paths, beside the catalogue's `mobile.computers.your_computer`. A code change, not a catalogue one.
- ur alert-title direction (`ur-C1`): the refusal alert title's base direction is a code item.

## Out-of-batch follow-ups the auditors listed

- es «ordenador» in 10 other keys
- hi `mobile.signin.diagnostics` निदान
- vi "bảng điều khiển Radient" vs desktop "Radient Console"
- ur `mobile.home.suggestion.phone_access` glossary
- zh-CN style-guide 请 rule

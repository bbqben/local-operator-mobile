# ru — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 13 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `rus2c` | `m3gap/audits/ru/record.json` | `record.json` | `c0f006c89c61bf2fb0be092f04993f58fe0ea9f45a31deb12d493827fff294c5` |
| `rus2c` | `m3gap/audits/ru/report.md` | `report.md` | `c50b6daa61b7fca2894a69fd6b364c9fdba6a8a6ea30b8ca190d0b2906a8ba6f` |
| `rus2c` | `m3gap/audits/ru/audit.log` | `audit.log` | `c5efb05a5641cb8d863b935eded740cfd308cd17cb4f2c866bc4cd95739ee801` |
| `rus2cr2` | `m3gap/audits-r2/ru/record.json` | `record.json` | `576c4f387ad6d0f14549538d51561fcaf5a0250e402c1fff68cb3d7588013c19` |
| `rus2cr2` | `m3gap/audits-r2/ru/report.md` | `report.md` | `69b4d409fbac140efe4f2e3cf101dddae0f0431552685d0f03773d30c20a97bc` |
| `rus2cr2` | `m3gap/audits-r2/ru/audit.log` | `audit.log` | `1abf6e554e6a2d2f601825357982ddadd64cfffcee42bbbe37e096c0e3068f0e` |

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `c12ae2da7082`, as recorded in the round-2 `record.json`.
- Draft sha256 (applied): `42030448ac68393b464cee2b45d0fd25d0021fee6a2162201cfa7c155993dda3`; it is the draft named in `rus2cr2/record.json` inputs.
- Applied: 13 values, `mobile.refusal` 11, `mobile.settings` 2. Keys outside the brief: none.
- `rus2c` (round 1): auditor session `df512b3fe891`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 1 MAJOR, 1 MINOR, 3 NIT).
- `rus2cr2` (round 2): auditor session `3a8c49e648fe`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
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

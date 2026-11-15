# vi — M3 S2c audit-gap bundles (the 66 shipped keys the M3 S2 slices left unaudited; 13 values changed)

Byte-identical copies of the programme's audit bundles; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s1-signin-computers/` and `m3-s2b2b-computers-setup/`; no `record.json` here carries an `audit_id`, so each directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `vis2c` | `m3gap/audits/vi/record.json` | `record.json` | `c45d73ac47a897736a71021c44dc2e2b3f1ce40d9347191a0340d5b9db7458ef` |
| `vis2c` | `m3gap/audits/vi/report.md` | `report.md` | `c30de68666edb05753c5ce26cf69c49da67766db72b5e76c24decb02a913eda9` |
| `vis2c` | `m3gap/audits/vi/audit.log` | `audit.log` | `c4654f61ecc1676cc4eb23da97e826d67cc68e43d43f3edf4eee2d3116fd6de2` |
| `vis2cr2` | `m3gap/audits-r2/vi/record.json` | `record.json` | `2f096c779bf6f0e1e253cf15f5dc5bd7687a4c21a6273d9b4a5404b624addb0d` |
| `vis2cr2` | `m3gap/audits-r2/vi/report.md` | `report.md` | `e2355a7de2648871c38ebcdf985482ddb8a37492e484a6d7036c752002e676a9` |
| `vis2cr2` | `m3gap/audits-r2/vi/audit.log` | `audit.log` | `f9933a900e0dcf335efae2a7dd7dac03404b79e643d9749baac328a62983f84a` |

## Provenance

- Brief: `brief-gap.json` sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` (66 keys; shipped values at mobile main `9214ff9b43c58256c49f48a8c2858f9c186d35c8`, the round-1 baseline). Every applied key's value on main `95adf190` still equalled the brief's value before the drafts were applied.
- Translator session: `c0230879f401`, as recorded in the round-2 `record.json`.
- Draft sha256 (applied): `aacf5a5e9a785c2f2868e059fcfda722dc2e438fe2fca3ce078d14e0907dc90c`; it is the draft named in `vis2cr2/record.json` inputs.
- Applied: 13 values, `mobile.refusal` 13. Keys outside the brief: none.
- `vis2c` (round 1): auditor session `50f759c57419`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `failed` (0 BLOCKER, 7 MAJOR, 3 MINOR, 4 NIT).
- `vis2cr2` (round 2): auditor session `ef29a5921e99`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`); verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
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

# hi — M3 S4 follow-ups bundle (`mobile.signin.diagnostics` → डायग्नॉस्टिक्स; 1 key audited, 0 applied)

Byte-identical copies of the programme's audit bundle; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s2c-audit-gap/`; the `record.json` carries no `audit_id`, so the directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `his4` | `m3s4/audits/hi/record.json` | `record.json` | `29896cb3ceee5882df8b52c4e81667f9678701236cf6402f6400113c68dfe1bc` |
| `his4` | `m3s4/audits/hi/report.md` | `report.md` | `0739bcc06638be79b750aec3ffc456cccd4390983b82c4e7db34049708d2735c` |
| `his4` | `m3s4/audits/hi/audit.log` | `audit.log` | `0d6db2d305a8c40b88750b0a7a1e6e435052274b98c00a9e7013a2b5594d2aac` |

The audited key mobile.signin.diagnostics was then removed as dead (no call site; proof in the PR); its audited value was never shipped.

## Provenance

- Brief: `brief-s4.json` sha256 `88022f5348abbb4d8429d770d22e300a200d1bb323eeac07d2f0ac0f5d31fb87` (source commit `51debe8e`, the PR #265 merge).
- Translator session: `61f275865611`, model `anthropic/claude-opus-5-5`, fallback none.
- Draft sha256 (audited): `042f62b1da1e2d31ddcc1a6d5da27a7518ebd6b297d77da63dccbeb6e0105f85`; it is the draft named in `his4/record.json` inputs.
- `his4`: auditor session `d91dff98db01`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`), independent of the translator session; verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT). The record's own `dead_key` field reports 0 call sites in `src`.
- Applied: 0 values. The key was deleted from all 8 locale catalogues and the en context sidecar instead.

## Route and review

- Route: git/scratch reads; `read_public_copy` not used (mobile paths refused by core; sidecars nested JSON, not routable).
- Native-speaker review: waived by the operator. The independent LLM audit above was done instead.

## Applied values (durable)

`applied-values.json` records that no `hi` value was applied (`key_count: 0`) and why. sha256 `1642a51cb6ca9638c8c4f7d834c08321ccadaecd24dcf7e084b1a73d07f98317`.

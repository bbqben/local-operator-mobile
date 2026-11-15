# es — M3 S4 follow-ups bundle (computer term → «máquina»; 10 keys audited, 7 applied)

Byte-identical copies of the programme's audit bundle; the files are not edited.
The directory name follows the `<locale><slice><round>` id convention of
`m3-s2c-audit-gap/`; the `record.json` carries no `audit_id`, so the directory name is derived and the mapping is recorded below.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `ess4` | `m3s4/audits/es/record.json` | `record.json` | `f8e07fba85e99281dc6aa600ab477fc145d772de3c446f57b9502e10c4cbc054` |
| `ess4` | `m3s4/audits/es/report.md` | `report.md` | `101dd680ab7f7935269773480c6dfa68952c7dbcb87dd80474cff625560d291c` |
| `ess4` | `m3s4/audits/es/audit.log` | `audit.log` | `b21db8932c892a067cd78af9d08f584d830dda937cc12dad002f0f5fb435597b` |

## Provenance

- Brief: `brief-s4.json` sha256 `88022f5348abbb4d8429d770d22e300a200d1bb323eeac07d2f0ac0f5d31fb87` (source commit `51debe8e`, the PR #265 merge).
- Translator session: `181884090f7a`, model `anthropic/claude-opus-5-5`, fallback none.
- Draft sha256: `38ca7de170e06dfc6cfb2dc42f8c6ae8bb179ba3da1f653201338456db919a6d`; it is the draft named in `ess4/record.json` inputs.
- `ess4`: auditor session `fa3846f03ef6`, model `anthropic/claude-opus-5-5`, fallback none (`fallback_used: false`), independent of the translator session; verdict `passed` (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).
- Applied: 7 values, `mobile.chrome` 1, `mobile.composer_input` 1, `mobile.computers` 1, `mobile.notifications` 1, `mobile.team_bridge` 3. Keys outside the brief: none.

## Not applied: 3 keys whose English source is stale

The brief was cut at `51debe8e`, before PR #264 (`cdcf3bb6`) rewrote the English of three keys. The drafted and audited es values translate the old English, so they were not applied; the shipped es values already follow the current English and contain no computer noun.

| Key | English in the brief (old) | English at this PR's head (new) |
|---|---|---|
| `mobile.notifications.permission.denied` | Notifications are turned off for this app in system settings. Turn them back on there to get Team Bridge message alerts. Alerts from your computers are not switched on yet — until they are, those work only while Local Operator is open. | Notifications are turned off for this app in system settings. Turn them on there. |
| `mobile.notifications.permission.granted` | Allowed. Team Bridge messages alert this phone when Radient's push delivery is available. Alerts from your computers are not switched on yet — until they are, those work only while Local Operator is open. | Notifications are on for this phone. |
| `mobile.notifications.permission.undetermined` | Ask your phone for permission to get Team Bridge message alerts. Alerts from your computers are not switched on yet — until they are, those work only while Local Operator is open. | Notifications are not on for this phone yet. |

## Remaining computer nouns

PR #264 also added three es keys that use «computadora»: `mobile.notifications.preferences.computer_keeps_sending`, `mobile.notifications.preferences.disabled_hint` and `mobile.notifications.preferences.update_computer`. They were outside this brief and still read «computadora» here. They are being translated and audited separately from the current source.

## Route and review

- Route: git/scratch reads; `read_public_copy` not used (mobile paths refused by core; sidecars nested JSON, not routable).
- Native-speaker review: waived by the operator. The independent LLM audit above was done instead.

## Applied values (durable)

`applied-values.json` holds the exact value of every key this PR changed in `es`, derived by script from this PR's head catalogues, beside the draft sha256 it was applied from — so "applied == audited" can be checked from the repository alone. sha256 `62cedf33a46074f60be09332e03754bc0635860ff1ac872e4aa8042c8a0830d2`. Re-check: every `values[k].value` equals the catalogue value at `values[k].file`, and equals the audited draft.

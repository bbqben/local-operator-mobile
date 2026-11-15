# es — M3 S4b follow-ups (computadora → «máquina»; 3 audited values applied)

Byte-identical audit bundle copies; original headers and historical source-state
observations are retained, not rewritten to describe the integrated S4/S4b tree.
`ess4b` follows the existing locale/slice directory convention.

| Directory | Source bundle | File | sha256 |
|---|---|---|---|
| `ess4b` | `m3s4b/audits/es/record.json` | `record.json` | `b21ade6644b4eabb21d19c03c39fe4c094723f32236a81206ca5ca88b443062c` |
| `ess4b` | `m3s4b/audits/es/report.md` | `report.md` | `9007109e74cafb493921e6ac48bf45997c3ca03b7e3f95a9d096f1752da35ead` |
| `ess4b` | `m3s4b/audits/es/audit.log` | `audit.log` | `b7d479cdda4478df0b3ee35d0a816479f746bbf983005033bae1bb8513698a7c` |
| `ess4b` | `m3s4b/audits/es/validator-execution.log` | `validator-execution.log` | `2ac9a05cfb7f767d8d6e73d2f16fb1cc20cd560da13785b0bec744303aa598c7` |

## Provenance and source admission

- Brief: `brief-s4b.json` sha256 `3a9a8c2f56d8bb1e3d05a6f0b4e786d4a009b266fef81b63307b883cfb498699`, source commit `d73b3ed21c231cdcf1f35cdf0dd947c623370010`.
- Draft: `draft-es.json` sha256 `b0150c45dd9ae866ab95aab09f0516a56d211c1c4711d8d834eaaa5782d2afea`.
- Before applying, all three current English values, complete context objects and current Spanish values matched the brief exactly at integration base `25d77e19451e709894ef356afd190d7c3975c574`.
- Translator session `a8d8fe606994`, model `anthropic/claude-opus-5-5`.
- Independent auditor session `c2cd21ace088`: initial `anthropic/claude-opus-5-5`; actual quota fallback `openai/gpt-6.1-sol` completed final verification/provenance. Original headers retained honestly.
- Verdict: passed; 0 BLOCKER, 0 MAJOR, 0 MINOR, 1 pre-existing optional comma NIT (`es-S4B-N1`). Deferred: exact audited wording is required; no rewording in this slice.
- Integration coder session `aa1bf657380a`: initial `anthropic/claude-opus-5-5`, actual quota fallback `openai/gpt-6.1-sol`.
- Route: direct source/scratch reads; no new translation or audit performed by the integrator.

## Applied values

`applied-values.json` records the three exact catalogue values and their draft hash.
Each value equals the audited draft byte-for-byte. This slice changes only
`mobile.notifications.preferences.computer_keeps_sending`,
`mobile.notifications.preferences.disabled_hint`, and
`mobile.notifications.preferences.update_computer`.

Together with the 7 applied values in `../m3-s4-followups/applied-values.json`,
there are 10 applied replacements. The combined Spanish catalogue retains 968
keys in 23 namespaces and has no «ordenador» or «computadora» occurrences.
These counts are derived from all Spanish non-context JSON catalogue files;
all 10 applied-value entries are checked against their named catalogue files.
The S4 README's remaining-nouns paragraph describes the earlier S4-only state.

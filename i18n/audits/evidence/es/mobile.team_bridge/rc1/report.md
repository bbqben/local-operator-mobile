# es audit — mobile.team_bridge — Radient Console brand slice — rc1

- Auditor: i18n-auditor, session e6d3e83a2511, model anthropic/claude-opus-5-5 (session model header; no fallback). Independent of translator session cf7c1f3dd00f.
- Date: 2026-11-15 · Keys: 2 · Draft sha256 8eb7925cda0641a7fa92ec2d2c7668686edd2db4595497c4992b344868cd7068 · Base 0a629e65 (values identical at 240e0826)
- **Verdict: passed** — BLOCKER 0, MAJOR 0, MINOR 0, NIT 0.

## Method
Read order: es style guide (`~/local-operator/i18n/style-guides/es.md`) → brief (`translation-brief.json`, operator decision, non-goals, es locale note, anaphor flag) → en proposal + en context notes → es current values at `0a629e65` (and `240e0826`, #270 head) → draft + translator notes. Mechanical checks executed in python (see `audit.log`); linguistic judgement by reading, no MT/back-translation service used.

Repo validator `npm run -s i18n:check` was **not** run: it validates the mobile working tree, and this audit is read-only (no checkout/apply). The lane owner must run it after applying the draft. Everything mechanical below comes from `audit.log`.

## Cross-cutting judgements (whole slice)
- **Brand without an article** ("en Radient Console", "Abre Radient Console", "que muestra Radient Console", "No se pudo abrir Radient Console"): correct, and native. Spanish treats product names as proper nouns without articles (cf. "en Gmail", "abre Chrome"), and the shipped es catalogues already do this: mobile "activa Local Operator", "permite Local Operator"; ui "del plan Radient Team" (19 occurrences); and local-operator `wire.errors.media.speech_radient_credit_low` already ships "Añade créditos en Radient Console". "la Radient Console" would give an English brand a grammatical gender, which the brand rule forbids. No adjective or pronoun in the 15 values agrees with the brand, so the brand never needs a gender.
- **Brand rule**: "Radient Console" appears exactly once per key, Latin script, capital C, one ASCII space; no partial brand ("Console" alone) anywhere.
- **Scope**: for every key, applying `la/tu consola de Radient → Radient Console` to the current value gives the draft exactly. Nothing outside the brand phrase changed, so «máquina» (#270) stays and no ordenador/computadora comes back.
- **Register**: tú imperatives preserved (abre, activa, comprueba, usa, sustituye, vincúlalo, revísalo, gestiona); infinitive button labels ("Abrir Radient Console"); sentence case; em dash spaced " — "; NFC.
- Informational, not a finding (out of this slice): local-operator-ui es still says "la consola de Radient" (for example `ui.providers.phone.action.open_console`). The operator decision says "across apps", so the ui catalogue needs its own slice later. This does not gate the mobile change.

## Per-key verdicts
| key | draft | verdict |
|---|---|---|
| gate.console_error | No se pudo abrir Radient Console. | OK. Impersonal «se pudo» needs no agreement with the brand; temporary-failure sense kept. |
| gate.manage_plan | Gestiona tu plan en Radient Console | OK. «tu plan» is kept (possessive on the plan, not the brand); no final full stop, matching en. |

#270 overlap: neither key is touched by #270 (rebase-check: gate.connecting and gate.signed_out_help only). The file needs a textual rebase only.

## Findings
None (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT).

## Addendum — canonical glossary rule (core PR #4053, merge 56662d28)
Source: `i18n/glossary.md` @ 56662d28, git blob `e3cdd40c909fb4bf515fc88abf57d7a85735a8e2`, sha256 `5de3929198c3f603ce14bf75fb992c0f5c7a1952c440b496386977f8c636fcc7` (§1 row "Radient Console" + paragraph "Radient Console is a deliberately named brand").
Conflict check against draft and verdict: **none**. The rule says keep the full name exactly (capital R and C, one U+0020) — met once per key; do not translate, inflect or replace it with a generic term — no key does; restructure surrounding prose with locale grammar — the articleless framing does exactly this; generic console/terminal concepts still translate. The one generic «la consola» (`setup.attach_help`) renders en's own generic second mention "the console", not a replacement of the brand, so it is permitted; the rule's emphasis on not substituting a generic term slightly strengthens the ES-RC-01 suggestion («…que aparece allí» or repeat the brand) but does not raise its severity. Verdict unchanged.

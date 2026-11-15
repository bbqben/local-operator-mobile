# es audit — mobile.computers — Radient Console brand slice — rc1

- Auditor: i18n-auditor, session e6d3e83a2511, model anthropic/claude-opus-5-5 (session model header; no fallback). Independent of translator session cf7c1f3dd00f.
- Date: 2026-11-15 · Keys: 8 · Draft sha256 8eb7925cda0641a7fa92ec2d2c7668686edd2db4595497c4992b344868cd7068 · Base 0a629e65 (values identical at 240e0826)
- **Verdict: passed** (current; see Addendum 3) — BLOCKER 0, MAJOR 0 (ES-RC-01 resolved in revised draft), MINOR 0, NIT 0.

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
| billing_help | En Radient Console, abre la facturación de este túnel y activa el acceso remoto. | OK. Fronted locative, articleless brand, natural. |
| disabled_help | Radient indica que este túnel no está activo ahora. Comprueba su estado en Radient Console. | OK. «su» refers to túnel, not the brand. |
| harness_help | En Radient Console, activa Local Operator para este túnel. | OK (dropping "harness" predates this slice and is outside the brand scope). |
| refusal.console_next | Abre Radient Console para solucionarlo allí. Iniciar sesión en este teléfono no lo cambiará. | OK. «allí» points cleanly to the brand. |
| refusal.open_console | Abrir Radient Console | OK. Infinitive label; 21 chars against the context's ~24 budget (shorter than the current 27). |
| route_invalid.not_radient | … Usa la dirección que muestra Radient Console para esta máquina. | OK. Brand as postposed subject reads naturally; «máquina» kept. |
| setup.amount_note | Sustituye {amount} por el precio que muestra Radient Console para esta cuenta: {command} rechaza … | OK. {amount}/{command} match en and current. |
| setup.attach_help | Si creaste el túnel en Radient Console, vincúlalo con el ID que muestra la consola. … | Acceptable; see ES-RC-01 (MINOR). |

## Findings
**ES-RC-01 — MINOR — `mobile.computers.setup.attach_help`**
Current draft: «… vincúlalo con el ID que muestra la consola.»
Problem: the generic back-reference is allowed by the brief and is not a partial brand. But the old antecedent «la consola de Radient» made «la consola» an obvious echo, and the new antecedent is an English brand. This card sits right above a CLI command («Este comando…»), and in this product family «consola» already names the terminal surface (local-operator-ui `ui.console.pane.label` = «Consola», `ui.console.new` = «Nueva consola»). So a reader can take «la consola» to mean the terminal where they run the command. It is also the only lowercase «consola» left in the mobile es catalogues (count 0 outside the brand phrase at 0a629e65).
Suggested: «Si creaste el túnel en Radient Console, vincúlalo con el ID que aparece allí. Este comando es para un túnel que ya existe: no crea uno nuevo.» Alternative, if the full noun is wanted: «… con el ID que muestra Radient Console.» (a repeated brand, which the brief allows).
Not gating: meaning survives for most readers and the brief explicitly permits a generic noun.

## Addendum — canonical glossary rule (core PR #4053, merge 56662d28)
Source: `i18n/glossary.md` @ 56662d28, git blob `e3cdd40c909fb4bf515fc88abf57d7a85735a8e2`, sha256 `5de3929198c3f603ce14bf75fb992c0f5c7a1952c440b496386977f8c636fcc7` (§1 row "Radient Console" + paragraph "Radient Console is a deliberately named brand").
Conflict check against draft and verdict: **none**. The rule says keep the full name exactly (capital R and C, one U+0020) — met once per key; do not translate, inflect or replace it with a generic term — no key does; restructure surrounding prose with locale grammar — the articleless framing does exactly this; generic console/terminal concepts still translate. The one generic «la consola» (`setup.attach_help`) renders en's own generic second mention "the console", not a replacement of the brand, so it is permitted; the rule's emphasis on not substituting a generic term slightly strengthens the ES-RC-01 suggestion («…que aparece allí» or repeat the brand) but does not raise its severity. Verdict unchanged.

## Addendum 2 — attach_help re-judged against the lane-owner English (2026-11-15)
New source (lane-owner decision under glossary 56662d28, relayed by the manager; sha256 `ec33d7534f5487f944c4c5167891b6237e830d7f25206d8e63c2d6c7068bd519`): "If you created the tunnel in the Radient Console, attach it by the id shown there. This command is for a tunnel that already exists — it will not create one."

**ES-RC-01 — raised MINOR → MAJOR (glossary violation / source drift) — `mobile.computers.setup.attach_help`**
Current draft: «Si creaste el túnel en Radient Console, vincúlalo con el ID que muestra la consola. …»
Problem: the source's second mention is now the locative "shown there"; the draft still back-refers with the generic noun «la consola», which the lane owner rules is a generic replacement of the brand under glossary §1 ("do not … replace it with a generic term"), and it no longer matches the source. The terminal ambiguity noted above remains.
Suggested: «Si creaste el túnel en Radient Console, vincúlalo con el ID que se muestra allí. Este comando es para un túnel que ya existe: no crea uno nuevo.» (brand once, no «consola», no placeholders; second sentence unchanged and still accurate for the unchanged second English sentence.)

The other 7 keys in this group are unaffected (their English is unchanged). **Group verdict: changes_requested** (1 unresolved MAJOR).

## Addendum 3 — re-audit of the revised draft (2026-11-15)
Revised draft sha256 `815e07adbb692bbdb27020de880758ea50044af5bf865e7a6dfd71741b5d3f1b` (was `8eb7925c…7068`). Executed checks (audit.log): 14/15 values byte-identical to the audited draft by per-key sha256; only `mobile.computers.setup.attach_help` changed.

`mobile.computers.setup.attach_help` now: «Si creaste el túnel en Radient Console, vincúlalo con el ID que se muestra allí. Este comando es para un túnel que ya existe: no crea uno nuevo.»
Against the lane-owner English ("…attach it by the id shown there. …"): accurate. «que se muestra allí» renders "shown there"; «allí» points unambiguously to Radient Console, and the generic «consola» is gone, so it conforms to glossary 56662d28. The brand appears once, with no article; no placeholders; NFC; tú register kept; second sentence unchanged and correct. The value is identical to the wording this audit suggested.

**ES-RC-01: resolved.** Group verdict: **passed** (0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT outstanding).

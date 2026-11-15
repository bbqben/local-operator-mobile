# fr audit — Radient Console brand slice — `mobile.computers` — frrc1c

- Auditor: i18n-auditor, session 346298b3099b, model anthropic/claude-opus-5-5 (session runtime model; no fallback observed). Independent of translator session 286d1946e740.
- Date: 2026-11-15 · Keys: 8 (of 15 in slice) · Base: local-operator-mobile `0a629e65`
- Inputs: draft-fr.json, notes-fr.md, translation-brief.json, en-proposal.json, i18n/style-guides/fr.md (hashes in record.json)
- Operator decision honoured: « Radient Console » verbatim, capital C, one ASCII space; surrounding copy localized.

## Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT

## Mechanical (see audit.log — executed)
- Key set: draft has exactly the 15 brief keys; this group's 8 keys present, none added/dropped.
- Placeholders identical to EN proposed; no markup/backticks/URLs in source or target; no ICU plurals in scope.
- Brand occurs exactly once per value, byte-exact; zero residual « console » noun, zero article/possessive before the brand.
- Typography: ’ only (no straight quotes), NFC, em dash spaced, no : ; ! ? needing U+202F.
- Redaction-marker regex (brief's redaction-scan.json): 0 hits.
- Brief fr/en current values byte-equal to catalogues @0a629e65; EN proposed equal to en-proposal.json and its sha256.
- Repo validator `scripts/i18n/generate.ts` on a git-archive copy @0a629e65 with all 15 draft keys applied: regenerate exit 0, `--check` exit 0 (969 keys, parity/argument types OK). Control on the unmodified copy: exit 0.
- Delta vs shipped fr: every value is the mechanical swap `la/votre console Radient` → `Radient Console`, except `setup.attach_help` (intended anaphor rewrite).

## Per-key review
| Key | Draft | Judgement |
|---|---|---|
| `mobile.computers.billing_help` | Dans Radient Console, ouvrez la facturation de ce tunnel et activez l’accès à distance. | OK — Bare brand after « Dans » reads as native product copy (cf. « dans Local Operator »). Accurate. |
| `mobile.computers.disabled_help` | Radient indique que ce tunnel n’est pas actif pour le moment. Vérifiez son état dans Radient Console. | OK — Accurate; « Vérifiez son état dans Radient Console » natural. |
| `mobile.computers.harness_help` | Dans Radient Console, activez Local Operator pour ce tunnel. | OK — Swap only. (Pre-existing, unchanged: EN “the Local Operator harness” rendered « Local Operator » — acceptable, not in scope.) |
| `mobile.computers.refusal.console_next` | Ouvrez Radient Console pour y régler le problème. Se reconnecter sur ce téléphone n’y changera rien. | OK — First « y » now points at the bare proper noun; still unambiguous. Second « y » (pre-existing) refers to the situation; fine. |
| `mobile.computers.refusal.open_console` | Ouvrir Radient Console | OK — Button, 22 chars vs EN 24; imperative-infinitive per guide. No overflow risk. |
| `mobile.computers.route_invalid.not_radient` | Ce n’est pas une adresse de tunnel Radient. Utilisez l’adresse affichée dans Radient Console pour cet ordinateur. | OK — Accurate; « affichée dans Radient Console » natural. |
| `mobile.computers.setup.amount_note` | {amount} correspond au prix affiché dans Radient Console pour ce compte — {command} refuse toute autre valeur, et l’étape 1 du guide des tunnels indique où trouver ce prix. | OK — {amount}/{command} intact; swap only. |
| `mobile.computers.setup.attach_help` | Si vous avez créé le tunnel dans Radient Console, associez-le à l’aide de l’identifiant qui y est affiché. Cette commande est réservée à un tunnel existant — elle n’en crée pas. | OK — « l’identifiant qui y est affiché »: « y » resumes « dans Radient Console » in the same sentence, gender-free, no partial brand, no other plausible antecedent (« affiché dans le tunnel » is nonsensical). Correct fix for the dangling « qu’elle ». Holds whether EN final keeps “the console” or repeats the brand. |

## Points the manager asked to judge
- **No-article brand**: correct per fr guide "Product-name policy" (no article on product names) and consistent with the catalogue's « Ouvrez Local Operator », « dans Local Operator », « forfait Radient Team », « Team Bridge ». (One pre-existing outlier elsewhere, « Le Local Operator » in a non-slice key, is out of scope.)
- **Dropped « votre » (3 refusal keys)**: accepted — see per-key notes (refusal group).
- **attach_help « qui y est affiché »**: accepted — see per-key note (computers group).
- **Glossary**: facturation, accès à distance, accès depuis un téléphone, forfait, identifiant, tunnel, app, ordinateur all match existing fr catalogue usage; vous register throughout.

## Not audited / limits
- No rendered-frame check (no device/simulator run); fit judged from character counts and roles (no maxCells hints exist for these keys in the en context sidecar).
- Ledger row not written: no repo worktree assigned; lane owner records it from record.json.

## Addendum r2 — 2026-11-15 — `mobile.computers.setup.attach_help` re-judged against revised English

- Trigger: lane owner revised EN after this audit because canonical glossary `56662d28` (local-operator PR #4053) forbids replacing the brand with a generic term. New EN (sha256 `ec33d7534f5487f944c4c5167891b6237e830d7f25206d8e63c2d6c7068bd519`): “If you created the tunnel in the Radient Console, attach it by the id shown there. This command is for a tunnel that already exists — it will not create one.”
- fr draft unchanged (file sha256 `67dec846a15c…`, value sha256 `333f5c64…`): « Si vous avez créé le tunnel dans Radient Console, associez-le à l’aide de l’identifiant qui y est affiché. Cette commande est réservée à un tunnel existant — elle n’en crée pas. »
- Judgement: **OK, no finding.** « qui y est affiché » is the exact French counterpart of “shown there”: the locative pronoun « y » resumes « dans Radient Console », just as “there” resumes “in the Radient Console”. It is a pronoun, not a generic noun, so it complies with the glossary rule (brand kept whole, never replaced by « la console »); no partial brand, no residual console noun. The fr already matched the revised EN's structure, so no rewording is needed. Second sentence unchanged and accurate.
- Execution: appended to audit.log (`tools/attach_r2.py`, 6 PASS / 0 FAIL).
- Group verdict unchanged: **passed**, 0 BLOCKER/MAJOR/MINOR/NIT.

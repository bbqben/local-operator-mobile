# fr audit — Radient Console brand slice — `mobile.team_bridge` — frrc1t

- Auditor: i18n-auditor, session 346298b3099b, model anthropic/claude-opus-5-5 (session runtime model; no fallback observed). Independent of translator session 286d1946e740.
- Date: 2026-11-15 · Keys: 2 (of 15 in slice) · Base: local-operator-mobile `0a629e65`
- Inputs: draft-fr.json, notes-fr.md, translation-brief.json, en-proposal.json, i18n/style-guides/fr.md (hashes in record.json)
- Operator decision honoured: « Radient Console » verbatim, capital C, one ASCII space; surrounding copy localized.

## Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT

## Mechanical (see audit.log — executed)
- Key set: draft has exactly the 15 brief keys; this group's 2 keys present, none added/dropped.
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
| `mobile.team_bridge.gate.console_error` | Impossible d’ouvrir Radient Console. | OK — « Impossible d’ouvrir Radient Console. » natural status. |
| `mobile.team_bridge.gate.manage_plan` | Gérez votre forfait dans Radient Console | OK — Swap only; no final period, matches EN and sibling « Team Bridge nécessite un forfait Radient Team ». |

## Points the manager asked to judge
- **No-article brand**: correct per fr guide "Product-name policy" (no article on product names) and consistent with the catalogue's « Ouvrez Local Operator », « dans Local Operator », « forfait Radient Team », « Team Bridge ». (One pre-existing outlier elsewhere, « Le Local Operator » in a non-slice key, is out of scope.)
- **Dropped « votre » (3 refusal keys)**: accepted — see per-key notes (refusal group).
- **attach_help « qui y est affiché »**: accepted — see per-key note (computers group).
- **Glossary**: facturation, accès à distance, accès depuis un téléphone, forfait, identifiant, tunnel, app, ordinateur all match existing fr catalogue usage; vous register throughout.

## Not audited / limits
- No rendered-frame check (no device/simulator run); fit judged from character counts and roles (no maxCells hints exist for these keys in the en context sidecar).
- Ledger row not written: no repo worktree assigned; lane owner records it from record.json.

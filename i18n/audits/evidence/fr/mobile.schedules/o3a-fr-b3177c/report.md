# fr audit — mobile.schedules — O3-a (o3a-fr-b3177c)

Verdict: **passed** — 0 BLOCKER/MAJOR; 0 findings total.
Auditor: i18n-auditor (team lopdev), model anthropic/claude-opus-5-5, session b3177ce4b009 — independent of translator session ebd00d285127.
Draft: draft-fr.json sha256 6e5b6412…42fd, read directly (not the relay); brief sha256 c57d0b16…f70d; en/context at local-operator-mobile 26663e18.

Keys audited (4): `mobile.schedules.section.wakes`, `mobile.schedules.section.wakes_summary`, `mobile.schedules.section.monitors`, `mobile.schedules.section.monitors_summary`

## Mechanical
Placeholders and ICU shape identical to en; every plural carries exactly one/many/other with `#` in each arm; NFC; U+2019 apostrophes, no U+0027; no : ; ! ? needing U+202F; redaction marker hits 0. Checker negative controls caught a dropped `many`, a renamed variable, an unbalanced brace and an ASCII apostrophe (see audit.log).

## Judgement
« Réveils » / « Surveillances » follow glossary (réveil, surveillance) and shipped count.wakes / count.monitors. Composes cleanly with shipped summaries: « Réveils · 3 planifiés · 1 échec », « Surveillances · 2 actives » (gender agrees). Middle dot kept.

## Findings
None.

## Width (worst realistic value / hint)
- `mobile.schedules.section.wakes`: "Réveils" 7 / ~16
- `mobile.schedules.section.wakes_summary`: "Réveils · 3 planifiés · 1 échec" 31
- `mobile.schedules.section.monitors`: "Surveillances" 13 / ~16
- `mobile.schedules.section.monitors_summary`: "Surveillances · 2 actives" 25

Ledger: not appended. The task scopes the repo as read-only; the manager owns `scripts/i18n/ledger.py append`, using this record.

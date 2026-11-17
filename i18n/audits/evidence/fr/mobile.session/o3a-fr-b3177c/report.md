# fr audit — mobile.session — O3-a (o3a-fr-b3177c)

Verdict: **passed** — 0 BLOCKER/MAJOR; 0 findings total.
Auditor: i18n-auditor (team lopdev), model anthropic/claude-opus-5-5, session b3177ce4b009 — independent of translator session ebd00d285127.
Draft: draft-fr.json sha256 6e5b6412…42fd, read directly (not the relay); brief sha256 c57d0b16…f70d; en/context at local-operator-mobile 26663e18.

Keys audited (2): `mobile.session.sheet_title.commands`, `mobile.session.sheet_title.attach`

## Mechanical
Placeholders and ICU shape identical to en; every plural carries exactly one/many/other with `#` in each arm; NFC; U+2019 apostrophes, no U+0027; no : ; ! ? needing U+202F; redaction marker hits 0. Checker negative controls caught a dropped `many`, a renamed variable, an unbalanced brace and an ASCII apostrophe (see audit.log).

## Judgement
« commandes » and « joindre » (verb as title, as in « Joindre un fichier ») are correct; lower case mirrors the en source as instructed.

## Findings
None.

## Width (worst realistic value / hint)
- `mobile.session.sheet_title.commands`: "commandes" 9 / ~16
- `mobile.session.sheet_title.attach`: "joindre" 7 / ~16

Ledger: not appended. The task scopes the repo as read-only; the manager owns `scripts/i18n/ledger.py append`, using this record.

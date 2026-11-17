# O3-a hi audit — mobile.session (o3a-hi-sess)

Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR. Keys: 2. Auditor: i18n-auditor, session 7f1fd014ba0d, model anthropic/claude-opus-5-5 (no fallback). Translator: session ea3ea9b9290e. No MT used.

## Mechanical
The JSON is valid. The key set and order match the brief. ICU args, plural arms (one/other) and the # count equal en. The text is NFC with no ZW*. Digits are Latin. There are 0 redaction-marker hits. The brief en/context hashes match 26663e18. A negative control caught the 4 seeded defects. See audit.log.

## Values
- `mobile.session.sheet_title.commands` = कमांड  (en: commands)
- `mobile.session.sheet_title.attach` = संलग्न करें  (en: attach)

## Terminology
'कमांड' (shipped loan). 'संलग्न करें' is the polite imperative of the shipped 'संलग्न' and stays clear of 'जोड़ें' (tunnel). Devanagari has no case, so the lower-case house style does not apply.

## Findings
None.

## Checks / notes

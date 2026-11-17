# O3-a hi audit — mobile.schedules (o3a-hi-sched)

Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR. Keys: 4. Auditor: i18n-auditor, session 7f1fd014ba0d, model anthropic/claude-opus-5-5 (no fallback). Translator: session ea3ea9b9290e. No MT used.

## Mechanical
The JSON is valid. The key set and order match the brief. ICU args, plural arms (one/other) and the # count equal en. The text is NFC with no ZW*. Digits are Latin. There are 0 redaction-marker hits. The brief en/context hashes match 26663e18. A negative control caught the 4 seeded defects. See audit.log.

## Values
- `mobile.schedules.section.wakes` = जागृतियाँ  (en: Wakes)
- `mobile.schedules.section.wakes_summary` = जागृतियाँ · {summary}  (en: Wakes · {summary})
- `mobile.schedules.section.monitors` = मॉनिटर  (en: Monitors)
- `mobile.schedules.section.monitors_summary` = मॉनिटर · {summary}  (en: Monitors · {summary})

## Terminology
'जागृतियाँ' (glossary wake→जागृति, shipped plural), 'मॉनिटर' (style guide: stored object → मॉनिटर). Middle dot and {summary} after the separator are kept.

## Findings
None.

## Checks / notes
- **xref-HI-T2**: Cross-reference: HI-T2 (mobile.time bundle). The draft's schedules keys are clean. The grammar slip comes from the shipped key mobile.schedules.due.ahead '{label} में' composing short.hours count=1. The follow-up belongs to code/that key and does not gate this slice.

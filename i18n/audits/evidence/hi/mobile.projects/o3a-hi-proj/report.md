# O3-a hi audit — mobile.projects (o3a-hi-proj)

Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR. Keys: 4. Auditor: i18n-auditor, session 7f1fd014ba0d, model anthropic/claude-opus-5-5 (no fallback). Translator: session ea3ea9b9290e. No MT used.

## Mechanical
The JSON is valid. The key set and order match the brief. ICU args, plural arms (one/other) and the # count equal en. The text is NFC with no ZW*. Digits are Latin. There are 0 redaction-marker hits. The brief en/context hashes match 26663e18. A negative control caught the 4 seeded defects. See audit.log.

## Values
- `mobile.projects.title` = प्रोजेक्ट  (en: Projects)
- `mobile.projects.section.progress` = प्रगति  (en: progress)
- `mobile.projects.section.milestones` = पड़ाव  (en: milestones)
- `mobile.projects.section.linked_sessions` = जुड़े सत्र  (en: linked sessions)

## Terminology
title 'प्रोजेक्ट' (glossary), 'प्रगति' and 'पड़ाव' (shipped mobile.projects), 'जुड़े सत्र' (glossary session→सत्र; shipped 'उससे जुड़े सत्रों').

## Findings
None.

## Checks / notes

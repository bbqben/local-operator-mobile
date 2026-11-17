# es audit — mobile.schedules — slice O3-a (o3a-es-268e89)

Verdict: **passed** (passed); unresolved BLOCKER/MAJOR: 0

Auditor: i18n-auditor, session 7a618dafc6fb, model anthropic/claude-opus-5-5. Translator session 073b2553cc4d; I am independent of it.
Input route: the draft content was relayed by the lane owner via hub message. The file sha was attested by the relayer; the auditor verified the canonical-JSON sha. A guardrail refused the auditor read access to the translator scratchpad.

Keys audited (4):
- `mobile.schedules.section.wakes` → «Despertares»
- `mobile.schedules.section.wakes_summary` → «Despertares · {summary}»
- `mobile.schedules.section.monitors` → «Monitorizaciones»
- `mobile.schedules.section.monitors_summary` → «Monitorizaciones · {summary}»

## Mechanical
Placeholders and types match en. ICU parses; selectors are within es one/many/other; every arm has #. NFC: 0 fails. Redaction-marker hits: 0. «ordenador»/«computadora»: 0. No usted/vosotros. See audit.log.

## Findings
None.

## Observations (not findings)
- Out of scope (reused key, not in this draft): mobile.chrome.destination.schedules ships «Horarios», while glossary schedule → «programación» and mobile.schedules.read_unreachable says «programaciones». That is pre-existing drift; record it, not gating here.
- Out of scope: the shipped summary keys add the noun («# monitorizaciones activas» for en «{count} armed»), so monitors_summary renders «Monitorizaciones · 2 monitorizaciones activas». The redundancy comes from the pre-existing summary key, not from this draft.

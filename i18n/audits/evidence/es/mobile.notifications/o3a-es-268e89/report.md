# es audit — mobile.notifications — slice O3-a (o3a-es-268e89)

Verdict: **changes_requested** (failed); unresolved BLOCKER/MAJOR: 1

Auditor: i18n-auditor, session 7a618dafc6fb, model anthropic/claude-opus-5-5. Translator session 073b2553cc4d; I am independent of it.
Input route: the draft content was relayed by the lane owner via hub message. The file sha was attested by the relayer; the auditor verified the canonical-JSON sha. A guardrail refused the auditor read access to the translator scratchpad.

Keys audited (6):
- `mobile.notifications.section.waiting` → «Pendientes de ti»
- `mobile.notifications.section.waiting_count` → «Pendientes de ti · {count}»
- `mobile.notifications.detail.title` → «Notificación»
- `mobile.notifications.detail.section_notification` → «Notificación»
- `mobile.notifications.detail.section_links` → «Enlaces»
- `mobile.notifications.detail.section_message` → «Mensaje»

## Mechanical
Placeholders and types match en. ICU parses; selectors are within es one/many/other; every arm has #. NFC: 0 fails. Redaction-marker hits: 0. «ordenador»/«computadora»: 0. No usted/vosotros. See audit.log.

## Findings
### F1 — MAJOR
Keys: `mobile.notifications.section.waiting`, `mobile.notifications.section.waiting_count`
Current: «Pendientes de ti» / «Pendientes de ti · {count}»
Problem: Third rendering of a product term that es already ships: the same inbox heading is «Te esperan · {count, number}» in core relay.notifications.section.waiting (web relay inbox), and «Esperando tu respuesta» in tui.notifications.group_waiting / ui.notifications.group.waiting. «Estar pendiente de alguien» also reads first as "keep an eye on / look after someone", not as "blocked on you".
Suggested: «Te esperan» / «Te esperan · {count}»
Note: Matches relay inbox wording; 10 chars, ~20 hint. «Esperando tu respuesta» (22) is over the ~20 hint.


## Observations (not findings)
- detail.*: «Notificación», «Enlaces» (hyperlinks → enlace per style-guide link rule), «Mensaje» (noun) are correct.

---

## Round 2 addendum (2026-11-15) — scoped to `mobile.notifications.section.waiting`, `mobile.notifications.section.waiting_count`

Input: round-2 values relayed by the lane owner in the auditor resume brief (3 changed keys); R2 file sha256 attested by the lane owner; auditor rebuilt R1 from its own R1 record (canonical sha verified) and computed the R2 canonical sha; the 37 unchanged keys were not verified against the file. R2 file sha256 `2d360fb43fee46d4be381a5af0bb3c092cabde59bef74ce5c6ab4d1e83e59e4e` (attested); R2 canonical-JSON sha256 `0d1628379a6081e5247151e83b9892abd078afc001484f2091e90cbd33dd9d46` (computed by auditor from R1 + the 3 relayed values).

- **F1** — fixed: «Te esperan» / «Te esperan · {count}» Matches shipped relay.notifications.section.waiting «Te esperan · {count, number}»; 10/15 chars within ~20; idiomatic, tú register.

Mechanical (audit.log, round-2 section): placeholders match en; NFC ok; marker/forbidden-word hits 0; years selectors one/many/other, # in every arm, CLDR category render table attached.

Verdict round 2: **passed** — unresolved BLOCKER/MAJOR: 0.

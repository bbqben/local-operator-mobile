# es audit — mobile.time — slice O3-a (o3a-es-268e89)

Verdict: **passed** (passed); unresolved BLOCKER/MAJOR: 0

Auditor: i18n-auditor, session 7a618dafc6fb, model anthropic/claude-opus-5-5. Translator session 073b2553cc4d; I am independent of it.
Input route: the draft content was relayed by the lane owner via hub message. The file sha was attested by the relayer; the auditor verified the canonical-JSON sha. A guardrail refused the auditor read access to the translator scratchpad.

Keys audited (23):
- `mobile.time.bucket.today` → «Hoy»
- `mobile.time.bucket.yesterday` → «Ayer»
- `mobile.time.bucket.earlier_this_week` → «Esta semana»
- `mobile.time.bucket.earlier` → «Anteriores»
- `mobile.time.relative.now` → «ahora»
- `mobile.time.relative.just_now` → «ahora mismo»
- `mobile.time.relative.yesterday` → «ayer»
- `mobile.time.relative.seconds_ago_compact` → «{count, plural, one {hace # s} other {hace # s}}»
- `mobile.time.relative.minutes_ago` → «{count, plural, one {hace # min} other {hace # min}}»
- `mobile.time.relative.hours_ago` → «{count, plural, one {hace # h} other {hace # h}}»
- `mobile.time.relative.days_ago` → «{count, plural, one {hace # d} other {hace # d}}»
- `mobile.time.relative.minutes_ago_compact` → «{count, plural, one {hace # min} other {hace # min}}»
- `mobile.time.relative.hours_ago_compact` → «{count, plural, one {hace # h} other {hace # h}}»
- `mobile.time.relative.days_ago_compact` → «{count, plural, one {hace # d} other {hace # d}}»
- `mobile.time.short.seconds` → «{count, plural, one {# s} other {# s}}»
- `mobile.time.short.minutes` → «{count, plural, one {# min} other {# min}}»
- `mobile.time.short.hours` → «{count, plural, one {# h} other {# h}}»
- `mobile.time.short.days` → «{count, plural, one {# d} other {# d}}»
- `mobile.time.short.weeks` → «{count, plural, one {# sem} other {# sem}}»
- `mobile.time.short.years` → «{count, plural, one {# a} other {# a}}»
- `mobile.time.short.minutes_spaced` → «{count, plural, one {# min} other {# min}}»
- `mobile.time.short.minutes_seconds` → «{minutes, plural, one {# min} other {# min}} {seconds} s»
- `mobile.time.short.hours_minutes` → «{hours, plural, one {# h} other {# h}} {minutes} min»

## Mechanical
Placeholders and types match en. ICU parses; selectors are within es one/many/other; every arm has #. NFC: 0 fails. Redaction-marker hits: 0. «ordenador»/«computadora»: 0. No usted/vosotros. See audit.log.

## Findings
### F2 — MINOR
Keys: `mobile.time.short.years`
Current: «{count, plural, one {# a} other {# a}}»
Problem: «a» is the CLDR narrow form, but in UI copy it is rarely seen and it collides with the preposition «a», so «2 a» is ambiguous. Its only consumer, session-projection.ts:409, is the session drawer column. That column already renders minutes_spaced «59 min» (6) and weeks «52 sem» (6) within the ~7 budget, so the full noun adds no new overflow.
Suggested: «{count, plural, one {# año} other {# años}}»
Note: «1 año» 5 / «10 años» 7 cells, within the drawer column’s ~7 (minutes_spaced).

### F3 — NIT
Keys: `mobile.time.relative.seconds_ago_compact`, `mobile.time.relative.minutes_ago`, `mobile.time.relative.hours_ago`, `mobile.time.relative.days_ago`, `mobile.time.relative.minutes_ago_compact`, `mobile.time.relative.hours_ago_compact`, `mobile.time.relative.days_ago_compact`, `mobile.time.short.seconds`, `mobile.time.short.minutes`, `mobile.time.short.hours`, `mobile.time.short.days`, `mobile.time.short.weeks`, `mobile.time.short.years`, `mobile.time.short.minutes_spaced`, `mobile.time.short.minutes_seconds`, `mobile.time.short.hours_minutes`
Current: «plural arms one/other only»
Problem: es CLDR categories are one/many/other. `many` is omitted, so it falls back to `other`, and output is identical: with a unit symbol and no noun, «de» is never inserted, so many==other. Shipped mobile es is mixed (23 plurals with many, 14 without). Core relay ships explicit identical arms (relay.notifications.age.minutes).
Suggested: «optional: add `many {…}` identical to `other` if the mobile validator or reviewers want category parity»
Note: Not gating.


## Observations (not findings)
- Translator flagged risks, judged: (1) compact == spaced «hace # min»: accepted. «m» reads as metres; core relay.notifications.age.minutes ships «hace # min» in the same inbox row role; «hace 59 min» is 11 against the ~10 hint, 1 over a soft hint. (2) «Esta semana»: accepted. Under «Hoy»/«Ayer» it reads as "the rest of this week", and it matches shipped tui/ui/relay group_week and the desktop sidebar. (3) «2 a»: see F2.
- Width: short.minutes «59 min» (6) and short.weeks «52 sem» (6) exceed the ~4 hint. Their slots already hold equal or wider es text: Team Bridge rowStamp falls back to a toLocaleDateString month-short date («15 nov», 6), and the drawer column holds minutes_spaced (~7). minutes_seconds / hours_minutes render «59 min 07 s» / «23 h 07 min» (11 vs en 7). The seconds/minutes stay zero-padded, so there is no tick jitter. All are the shortest correct forms, so I filed no finding. A rendered check of the running transcript item is recommended.

---

## Round 2 addendum (2026-11-15) — scoped to `mobile.time.short.years`

Input: round-2 values relayed by the lane owner in the auditor resume brief (3 changed keys); R2 file sha256 attested by the lane owner; auditor rebuilt R1 from its own R1 record (canonical sha verified) and computed the R2 canonical sha; the 37 unchanged keys were not verified against the file. R2 file sha256 `2d360fb43fee46d4be381a5af0bb3c092cabde59bef74ce5c6ab4d1e83e59e4e` (attested); R2 canonical-JSON sha256 `0d1628379a6081e5247151e83b9892abd078afc001484f2091e90cbd33dd9d46` (computed by auditor from R1 + the 3 relayed values).

- **F2** — fixed: «{count, plural, one {# año} many {# de años} other {# años}}» Unambiguous; 5–7 cells for realistic counts, within the drawer column’s ~7. The added many arm is correct: CLDR es many = exact multiples of 10^6 and a noun follows, so «1.000.000 de años» per style guide §Plurals; 1.500.000 → other «1.500.000 años». Unreachable in practice, harmless.
- **F3** — deferred — by translator decision: abbreviated units take no «de», so many==other; fallback output identical:  NIT; does not gate.

Mechanical (audit.log, round-2 section): placeholders match en; NFC ok; marker/forbidden-word hits 0; years selectors one/many/other, # in every arm, CLDR category render table attached.

Verdict round 2: **passed** — unresolved BLOCKER/MAJOR: 0.

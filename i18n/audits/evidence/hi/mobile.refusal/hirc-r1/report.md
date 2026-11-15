# hi audit — mobile.refusal — Radient Console brand slice (hirc-r1)

- Auditor: i18n-auditor (lopdev), session f56acc09bfb2, model anthropic/claude-opus-5-5 (no fallback observed). Independent of translator session 38593fddf9a8.
- Date: 2026-11-15 · Keys: 4 · Verdict: **passed** · Unresolved BLOCKER/MAJOR: 0
- Inputs: draft-hi.json sha256 5db3adc13b96…, en-proposal sha256 16067361fcc0… (+ attach_help override), glossary@56662d28, hi style guide. Full hashes in record.json.
- Mechanical: repo validator (`generate.ts`, `generate.ts --check`, `check-strings.ts --base 0a629e65`) exit 0 on an extracted copy with the slice applied; own checks 4/4 PASS (placeholders, NFC, no ZWJ/ZWNJ, brand exact with ASCII space, no Devanagari कंसोल, Latin digits, danda parity). See audit.log.

**Summary:** One MINOR (M1): possessive «आपके/अपने» dropped in 3 keys without need — Hindi possessives agree with the head/postposition, never inflect the brand. Meaning preserved; non-gating. No BLOCKER/MAJOR.

### Findings
- **HIRC-R-M1 — MINOR** (keys `mobile.refusal.console_disabled.title`, `mobile.refusal.open_console.title`, `mobile.refusal.refused.body`)
  - Current: «{computer} के लिए फ़ोन एक्सेस Radient Console में बंद है।» · «{computer} के फ़ोन एक्सेस के लिए Radient Console में एक बदलाव ज़रूरी है।» · «इसे Radient Console में जाँचें, या फिर से कोशिश करें।»
  - Problem: the English keeps "your Radient Console"; the draft dropped «आपके»/«अपने», citing the fr/es/zh-CN/ru precedent. That precedent exists because those languages would put gender/case agreement on or around the brand; Hindi has no such problem — «आपके/अपने» agrees with the following postposition (में), the brand stays byte-exact, and the glossary's no-inflect rule is not touched. The base already used the possessive, and sibling titles in the same namespace keep it (`phone_access_off.title` «आपके Radient खाते के लिए…», `balance_out.title` «आपका Radient बैलेंस…»), so the slice is now the odd one out. Meaning is not lost (the sentences remain correct and natural), hence MINOR.
  - Suggested: «{computer} के लिए फ़ोन एक्सेस आपके Radient Console में बंद है।» · «{computer} के फ़ोन एक्सेस के लिए आपके Radient Console में एक बदलाव ज़रूरी है।» · «इसे अपने Radient Console में जाँचें, या फिर से कोशिश करें।» Either form passes; restoring keeps source fidelity and makes the change truly brand-only.

### Other checks
- `mobile.refusal.action.open_console` «Radient Console खोलें»: no final mark (en none), ≈19 cells.
- `{computer}` preserved byte-exact in both titles; danda on titles/body matches en full stops.

No MT/translation service used; judgement by reading.

## Addendum — round 2 (2026-11-15), remediation re-check
- New draft sha256 `6ca13b85cba127a78837f2623d7bdf4905186ea7612a7b77b29aaf87bccab738` (round 1 audited `5db3adc1…`).
- **HIRC-R-M1 — fixed.** All three keys now carry the possessive, byte-equal to the suggested wording, and differ from base 0a629e65 only by «Radient कंसोल» → «Radient Console»:
  - `console_disabled.title` «{computer} के लिए फ़ोन एक्सेस आपके Radient Console में बंद है।»
  - `open_console.title` «{computer} के फ़ोन एक्सेस के लिए आपके Radient Console में एक बदलाव ज़रूरी है।»
  - `refused.body` «इसे अपने Radient Console में जाँचें, या फिर से कोशिश करें।»
  «आपके/अपने» agree with «में»; the brand is exact and uninflected; `{computer}` preserved; NFC, no ZWJ/ZWNJ, danda end.
- The other 12 slice values are byte-identical to round 1 (compared against the values captured in each hirc-* audit.log; the translator kept no copy of the old draft file).
- Validator not re-run (host-load hold until 20:30Z). The round-1 run predates the hold; the change is 3 string values with no placeholders or structure touched — CI to confirm.
- Verdict: **passed**, unresolved BLOCKER/MAJOR 0, open findings: none.

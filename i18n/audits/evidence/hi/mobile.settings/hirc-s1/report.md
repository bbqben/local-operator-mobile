# hi audit — mobile.settings — Radient Console brand slice (hirc-s1)

- Auditor: i18n-auditor (lopdev), session f56acc09bfb2, model anthropic/claude-opus-5-5 (no fallback observed). Independent of translator session 38593fddf9a8.
- Date: 2026-11-15 · Keys: 1 · Verdict: **passed** · Unresolved BLOCKER/MAJOR: 0
- Inputs: draft-hi.json sha256 5db3adc13b96…, en-proposal sha256 16067361fcc0… (+ attach_help override), glossary@56662d28, hi style guide. Full hashes in record.json.
- Mechanical: repo validator (`generate.ts`, `generate.ts --check`, `check-strings.ts --base 0a629e65`) exit 0 on an extracted copy with the slice applied; own checks 1/1 PASS (placeholders, NFC, no ZWJ/ZWNJ, brand exact with ASCII space, no Devanagari कंसोल, Latin digits, danda parity). See audit.log.

**Summary:** delete_help: only the brand changed; «Radient Console से हटाया जाता है» reads correctly (instrumental से). Destructive copy accurate: account + every tunnel deleted, sessions untouched. No findings.

### Findings
None.

### Checks
- Only `Radient कंसोल` → `Radient Console`; all other bytes are identical to base 0a629e65.
- Destructive-action accuracy: deletion happens in the browser via Radient Console («ब्राउज़र में Radient Console से हटाया जाता है»), the app cannot do it, it removes the account and every tunnel («खाता और उस पर मौजूद हर टनल मिट जाती है»), and sessions on the computer are untouched. Polarity correct.
- «से» here is instrumental/agentive ("through"), natural with passive «हटाया जाता है»; no agreement falls on the brand. Register आप, सत्र per style guide.

No MT/translation service used; judgement by reading.

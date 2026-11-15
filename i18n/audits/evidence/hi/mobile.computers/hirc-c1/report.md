# hi audit — mobile.computers — Radient Console brand slice (hirc-c1)

- Auditor: i18n-auditor (lopdev), session f56acc09bfb2, model anthropic/claude-opus-5-5 (no fallback observed). Independent of translator session 38593fddf9a8.
- Date: 2026-11-15 · Keys: 8 · Verdict: **passed** · Unresolved BLOCKER/MAJOR: 0
- Inputs: draft-hi.json sha256 5db3adc13b96…, en-proposal sha256 16067361fcc0… (+ attach_help override), glossary@56662d28, hi style guide. Full hashes in record.json.
- Mechanical: repo validator (`generate.ts`, `generate.ts --check`, `check-strings.ts --base 0a629e65`) exit 0 on an extracted copy with the slice applied; own checks 8/8 PASS (placeholders, NFC, no ZWJ/ZWNJ, brand exact with ASCII space, no Devanagari कंसोल, Latin digits, danda parity). See audit.log.

**Summary:** No BLOCKER/MAJOR/MINOR. Brand verbatim in all 8; masculine agreement (दिखाता है) correct; «वहाँ» in attach_help is a clear, natural back-reference to Radient Console and matches the English override. Pre-existing NITs only (N1, N2), unchanged bytes, non-gating.

### Findings
None at BLOCKER/MAJOR/MINOR.

**Pre-existing NITs (surrounding bytes unchanged from base 0a629e65 — recorded, do not gate, out of slice scope):**
- **HIRC-C-N1** `mobile.computers.billing_help` — «रिमोट ऐक्सेस»: hi catalogues spell this word «एक्सेस» 15× vs «ऐक्सेस» 3× (incl. this key; the refusal keys in this same slice use «फ़ोन एक्सेस»). Suggest «रिमोट एक्सेस» in a later consistency sweep.
- **HIRC-C-N2** `mobile.computers.route_invalid.not_radient` — «…दिखाया गया पता उपयोग करें»: more standard «…दिखाए गए पते का उपयोग करें». Colloquially acceptable as is.

### Judgements on the brief's questions
- **Masculine agreement** (`setup.amount_note` «Radient Console … दिखाता है»): correct. Hindi gives a Latin brand the gender of its class noun; «कंसोल» is masculine (as the base string already treated it), so «दिखाता है» is right and the brand itself is not inflected.
- **«वहाँ»** (`setup.attach_help`): «अगर आपने टनल Radient Console में बनाई है, तो वहाँ दिखने वाली आईडी से उसे जोड़ें।» — «वहाँ» resolves unambiguously to Radient Console (only locative antecedent), matches the override "by the id shown there", and avoids repeating the brand. Gender chain is consistent (टनल f.: बनाई / नई टनल; आईडी f.: दिखने वाली). Second sentence keeps the warning polarity ("इससे नई टनल नहीं बनेगी"). Approve.
- **Digits/punctuation**: «चरण 1» Latin digit per guide §Numbers; danda on every sentence where en has a full stop; button `refusal.open_console` has no final mark (en none); spaced em dashes kept from base.
- **Fit**: `refusal.open_console` «Radient Console खोलें» = 21 code points / ≈19 cells (combining marks zero-width), under the ~24-character note.
- **Accuracy**: billing/disabled/harness/console_next/route_invalid: only `Radient कंसोल`→`Radient Console`; meaning identical. console_next still says plainly that signing in on the phone won't change it.

No MT/translation service used; judgement by reading.

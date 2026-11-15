# ur audit — mobile.refusal — Radient Console brand slice (rc-r1)

Auditor: i18n-auditor (lopdev), session 05d8cefe0aae, model anthropic/claude-opus-5-5; independent of translator session 2f307f615240. Date 2026-11-15.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

Mechanical checks: placeholders, brand string (exactly once per key, Latin, capital C, U+0020), no residual کنسول, no manual bidi controls, Urdu punctuation only (۔ ،), JSON valid, key set exact. All pass (audit.log). Repo validator not run (host-load hold).

## Keys

- `mobile.refusal.action.open_console`
  - EN: Open Radient Console
  - UR: Radient Console کھولیں
- `mobile.refusal.console_disabled.title`
  - EN: Phone access for {computer} is turned off in your Radient Console.
  - UR: {computer} کے لیے فون کی رسائی Radient Console میں بند ہے۔
- `mobile.refusal.open_console.title`
  - EN: Phone access for {computer} needs a change in your Radient Console.
  - UR: {computer} کی فون کی رسائی کے لیے Radient Console میں ایک تبدیلی ضروری ہے۔
- `mobile.refusal.refused.body`
  - EN: Check it in your Radient Console, or try again.
  - UR: اسے Radient Console میں چیک کریں، یا دوبارہ کوشش کریں۔

## Findings

### UR-RC-R1 — NIT (gating: False)
Keys: mobile.refusal.console_disabled.title, mobile.refusal.open_console.title, mobile.refusal.refused.body
Current: {computer} کے لیے فون کی رسائی Radient Console میں بند ہے۔ | {computer} کی فون کی رسائی کے لیے Radient Console میں ایک تبدیلی ضروری ہے۔ | اسے Radient Console میں چیک کریں، یا دوبارہ کوشش کریں۔
Problem: The possessive 'your' was dropped, but the English proposal keeps it ('in your Radient Console'). The fr/es reason for dropping it (article/gender agreement on the brand) doesn't apply in Urdu: oblique کے/اپنے before a masculine noun plus میں is grammatical and natural (cf. «آپ کے Gmail میں»). The meaning loss is slight, because ownership is still implied.
Suggested: Optional: «… آپ کے Radient Console میں بند ہے۔», «… آپ کے Radient Console میں ایک تبدیلی ضروری ہے۔», «اسے اپنے Radient Console میں چیک کریں، یا دوبارہ کوشش کریں۔». The current wording is also acceptable.


## Notes (RTL / agreement / glossary)

Latin-first: action.open_console (refusal-surface.tsx:383-405, labelDir on every action). console_disabled.title and open_console.title begin with {computer}, whose runtime first-strong char depends on the computer's name; the headline Text spreads composedDir (refusal-surface.tsx:327-331). The translator counted 6 Latin-first values; by template there are 8, if you include these 2 placeholder-led titles. Both were placeholder-led before this slice.

Native RTL proof is out of scope and still unverified. Android: per direction.tsx:192-198, nothing in RN Android reads writingDirection (FIRSTSTRONG_LTR heuristic), so every Latin-first ur line there may lay out LTR whatever composedDir says. Only a rendered Android/iOS RTL frame can settle this.

Glossary §1 (56662d28): the brand is kept verbatim, not translated, transliterated or inflected, and no generic noun replaces it. Style guide: آپ register, respectful imperatives (کھولیں، کریں), no bidi marks. Conforms.

Ledger: not recorded. The brief says no edits and no commits; the bundle lives in auditor scratch only and is NOT a tracked i18n/audits/evidence record.

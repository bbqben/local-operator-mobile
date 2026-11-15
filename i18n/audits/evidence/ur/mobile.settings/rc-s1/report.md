# ur audit — mobile.settings — Radient Console brand slice (rc-s1)

Auditor: i18n-auditor (lopdev), session 05d8cefe0aae, model anthropic/claude-opus-5-5; independent of translator session 2f307f615240. Date 2026-11-15.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

Mechanical checks: placeholders, brand string (exactly once per key, Latin, capital C, U+0020), no residual کنسول, no manual bidi controls, Urdu punctuation only (۔ ،), JSON valid, key set exact. All pass (audit.log). Repo validator not run (host-load hold).

## Keys

- `mobile.settings.account.delete_help`
  - EN: Deleting your account happens in the Radient Console, in the browser — this app cannot do it for you. It deletes the account and every tunnel on it. Sessions on your computer are not touched.
  - UR: اکاؤنٹ براؤزر میں Radient Console سے حذف ہوتا ہے — یہ ایپ آپ کے لیے ایسا نہیں کر سکتی۔ اکاؤنٹ حذف کرنے سے اس کے تمام ٹنلز بھی حذف ہو جاتے ہیں۔ آپ کے کمپیوٹر پر موجود سیشنز متاثر نہیں ہوتے۔

## Findings

None.

## Notes (RTL / agreement / glossary)

delete_help is destructive-adjacent copy: meaning is exact (account deleted in the browser via Radient Console; the app cannot do it; all tunnels deleted; local sessions untouched). No polarity errors. The only change is the brand swap; «سے حذف ہوتا ہے» reads naturally after the brand.

Native RTL proof is out of scope and still unverified. Android: per direction.tsx:192-198, nothing in RN Android reads writingDirection (FIRSTSTRONG_LTR heuristic), so every Latin-first ur line there may lay out LTR whatever composedDir says. Only a rendered Android/iOS RTL frame can settle this.

Glossary §1 (56662d28): the brand is kept verbatim, not translated, transliterated or inflected, and no generic noun replaces it. Style guide: آپ register, respectful imperatives (کھولیں، کریں), no bidi marks. Conforms.

Ledger: not recorded. The brief says no edits and no commits; the bundle lives in auditor scratch only and is NOT a tracked i18n/audits/evidence record.

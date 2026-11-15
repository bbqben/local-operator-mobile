# ur audit — mobile.computers — Radient Console brand slice (rc-c1)

Auditor: i18n-auditor (lopdev), session 05d8cefe0aae, model anthropic/claude-opus-5-5; independent of translator session 2f307f615240. Date 2026-11-15.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

Mechanical checks: placeholders, brand string (exactly once per key, Latin, capital C, U+0020), no residual کنسول, no manual bidi controls, Urdu punctuation only (۔ ،), JSON valid, key set exact. All pass (audit.log). Repo validator not run (host-load hold).

## Keys

- `mobile.computers.billing_help`
  - EN: In the Radient Console, open this tunnel's billing settings and activate remote access.
  - UR: Radient Console میں اس ٹنل کی بلنگ کی ترتیبات کھولیں اور ریموٹ رسائی فعال کریں۔
- `mobile.computers.disabled_help`
  - EN: Radient says this tunnel isn't active right now. Check its status in the Radient Console.
  - UR: Radient کے مطابق یہ ٹنل اس وقت فعال نہیں ہے۔ Radient Console میں اس کی حالت دیکھیں۔
- `mobile.computers.harness_help`
  - EN: In the Radient Console, enable the Local Operator harness for this tunnel.
  - UR: Radient Console میں اس ٹنل کے لیے Local Operator فعال کریں۔
- `mobile.computers.refusal.console_next`
  - EN: Open the Radient Console to fix it there. Signing in on this phone will not change it.
  - UR: اسے ٹھیک کرنے کے لیے Radient Console کھولیں۔ اس فون پر سائن ان کرنے سے یہ نہیں بدلے گا۔
- `mobile.computers.refusal.open_console`
  - EN: Open the Radient Console
  - UR: Radient Console کھولیں
- `mobile.computers.route_invalid.not_radient`
  - EN: That is not a Radient tunnel address. Use the address the Radient Console shows for this computer.
  - UR: یہ Radient ٹنل کا پتہ نہیں ہے۔ وہ پتہ استعمال کریں جو Radient Console اس کمپیوٹر کے لیے دکھاتا ہے۔
- `mobile.computers.setup.amount_note`
  - EN: {amount} is the price the Radient Console shows for this account — {command} refuses anything else, and step 1 of the tunnel guide links to where it is shown.
  - UR: یہاں {amount} کی جگہ وہ قیمت لکھیں جو Radient Console اس اکاؤنٹ کے لیے دکھاتا ہے — {command} اس کے علاوہ کچھ قبول نہیں کرتی، اور ٹنل گائیڈ کے پہلے مرحلے میں اس جگہ کا لنک ہے جہاں یہ قیمت دکھائی جاتی ہے۔
- `mobile.computers.setup.attach_help`
  - EN: If you created the tunnel in the Radient Console, attach it by the id shown there. This command is for a tunnel that already exists — it will not create one.
  - UR: اگر آپ نے ٹنل Radient Console میں بنائی تھی، تو وہاں دکھائی گئی آئی ڈی سے اسے جوڑیں۔ یہ کمانڈ پہلے سے موجود ٹنل کے لیے ہے — یہ نئی ٹنل نہیں بنائے گی۔

## Findings

None.

## Notes (RTL / agreement / glossary)

Latin-first keys billing_help, harness_help, refusal.open_console: their render sites state the page base (refusal-surface.tsx:357-359 detail Text {...composedDir}; :451-455 Button labelDir=composedDir), so on iOS/web the base is RTL and the brand reads first. Mid-line brand: L·space·L resolves L, so the brand reads as one ordered unit. Agreement: دکھاتا ہے (masc., brand inherits کنسول's gender), کمانڈ fem. (قبول نہیں کرتی، نہیں بنائے گی), ٹنل fem. (بنائی) — all consistent. attach_help «وہاں»: the only preceding locative is «Radient Console میں», so the referent is unambiguous; it matches the override 'shown there'. Width: refusal.open_console is 22 chars against the ~24 hint. Out of slice (wording unchanged, non-gating): harness_help still renders 'Local Operator harness' as «Local Operator» with no head noun.

Native RTL proof is out of scope and still unverified. Android: per direction.tsx:192-198, nothing in RN Android reads writingDirection (FIRSTSTRONG_LTR heuristic), so every Latin-first ur line there may lay out LTR whatever composedDir says. Only a rendered Android/iOS RTL frame can settle this.

Glossary §1 (56662d28): the brand is kept verbatim, not translated, transliterated or inflected, and no generic noun replaces it. Style guide: آپ register, respectful imperatives (کھولیں، کریں), no bidi marks. Conforms.

Ledger: not recorded. The brief says no edits and no commits; the bundle lives in auditor scratch only and is NOT a tracked i18n/audits/evidence record.

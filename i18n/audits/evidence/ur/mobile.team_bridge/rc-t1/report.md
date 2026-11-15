# ur audit — mobile.team_bridge — Radient Console brand slice (rc-t1)

Auditor: i18n-auditor (lopdev), session 05d8cefe0aae, model anthropic/claude-opus-5-5; independent of translator session 2f307f615240. Date 2026-11-15.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

Mechanical checks: placeholders, brand string (exactly once per key, Latin, capital C, U+0020), no residual کنسول, no manual bidi controls, Urdu punctuation only (۔ ،), JSON valid, key set exact. All pass (audit.log). Repo validator not run (host-load hold).

## Keys

- `mobile.team_bridge.gate.console_error`
  - EN: Could not open the Radient Console.
  - UR: Radient Console نہیں کھل سکا۔
- `mobile.team_bridge.gate.manage_plan`
  - EN: Manage your plan in the Radient Console
  - UR: Radient Console میں اپنا پلان منظم کریں

## Findings

### UR-RC-T1 — MINOR (gating: False)
Keys: mobile.team_bridge.gate.manage_plan, mobile.team_bridge.gate.console_error
Current: Radient Console میں اپنا پلان منظم کریں | Radient Console نہیں کھل سکا۔
Problem: Both values start with the Latin brand (first strong char L). Their render sites set no paragraph direction: gate.tsx:123-128 (native-only Text) and :169-172 (error Text, web path) don't spread useComposedDir(). Per the app's own note (direction.tsx:188-191), iOS then resolves the base from the first strong char, so the line lays out LTR and the brand ends up at the END of the right-to-left reading. On web, RNW falls back to dir=auto. This was already true before this slice (base 'Radient کنسول…' also starts with Latin). It's a render-site gap, not a translation defect.
Suggested: Fix at the render site: spread {...composedDir} on both Text elements, as refusal-surface does. For manage_plan, an optional copy-level hedge that reads equally naturally: «اپنا پلان Radient Console میں منظم کریں». console_error has no natural Urdu-first wording, so keep it and fix the code.


## Notes (RTL / agreement / glossary)

console_error «Radient Console نہیں کھل سکا۔»: masculine سکا agrees with the brand as subject and reads naturally. manage_plan: the possessive «اپنا» is on پلان, as in the source. See T1 for direction.

Native RTL proof is out of scope and still unverified. Android: per direction.tsx:192-198, nothing in RN Android reads writingDirection (FIRSTSTRONG_LTR heuristic), so every Latin-first ur line there may lay out LTR whatever composedDir says. Only a rendered Android/iOS RTL frame can settle this.

Glossary §1 (56662d28): the brand is kept verbatim, not translated, transliterated or inflected, and no generic noun replaces it. Style guide: آپ register, respectful imperatives (کھولیں، کریں), no bidi marks. Conforms.

Ledger: not recorded. The brief says no edits and no commits; the bundle lives in auditor scratch only and is NOT a tracked i18n/audits/evidence record.

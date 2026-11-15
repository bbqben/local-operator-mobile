# Urdu (ur) — M3 S2c audit-gap, ROUND 2 independent audit

**Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 1 (code items ur-GAP-C1/C2 out of this slice)

Source commit `9214ff9b43c58256c49f48a8c2858f9c186d35c8` · brief `30da9470…edbda5` · draft `a107e8d2…5c47c6a0` · round-1 record `e59ccc09…d086e` (all sha256 verified before use).
Auditor: i18n-auditor (lopdev), session 2e68665fe1be, model anthropic/claude-opus-5-5, no fallback. Independent of round-1 auditor (6ce4c67b2038) and translator (4ccb027fe9ed). No translation/MT service used. No repo file edited.
Route: git/scratch reads; read_public_copy not used (mobile paths refused by core; sidecars nested JSON, not routable).

## 1. Round-1 resolution (11/11 resolved)

| ID | Sev | Status | Note |
|---|---|---|---|
| ur-GAP-1 | MAJOR | resolved | → replaced by ← (U+2190, ON, not mirrored; resolves R in RTL, points reading-forward); desktop label quoted “فون کی رسائی ترتیب دیں” = ui.providers.phone.action.set_up. |
| ur-GAP-2 | MAJOR | resolved | 3× ←; labels = desktop ترتیبات / Radient اکاؤنٹ / فون کی رسائی. |
| ur-GAP-3 | MAJOR | resolved | 3× ←; Set up label quoted; price-first sentence unchanged and accurate. |
| ur-GAP-4 | MINOR | resolved | 4 bodies now “دوبارہ کوشش کریں” (U+201C…U+201D), = mobile.refusal.action.retry; all 15 quoting keys in ur mobile catalogues now use the same order. |
| ur-GAP-5 | MINOR | resolved | دوبارہ جانچیں / جانچ جاری ہے… = desktop ui.providers.phone.action.check_again, ui.mesh.mesh_page.checking. |
| ur-GAP-6 | MINOR | resolved | عارضی طور پر روک دی ہے carries 'paused'. |
| ur-GAP-7 | MINOR | resolved | اس وقت removes the 'not yet' implication. |
| ur-GAP-8 | NIT | resolved | اس کا نیٹ ورک = its (the computer's) network. |
| ur-GAP-9 | NIT | resolved | تشخیصی معلومات (desktop term); کاپی kept as mobile's verb; ہو گئیں agrees with fem. pl. معلومات. |
| ur-GAP-10 | NIT | resolved (adjusted) | ہو سکیں instead of suggested ہو سکی: sound, follows GAP-9's fem. pl. subject and matches desktop ui.providers.phone.diagnostics_failed. |
| ur-GAP-11 | NIT | resolved | دوبارہ منسلک ہو رہا ہے; the same verb carried to the three 'reconnects by itself' bodies already being edited — justified, no extra key touched. |

## 2. Scope
Draft = 16 keys = exactly the keys named by ur-GAP-1..11; no key added or dropped; valid JSON. The verb change منسلک in balance_out/suspended/wait_network bodies rides on keys already flagged (GAP-4/GAP-8) and is the brief's same-English-same-wording rule — accepted.

## 3. Placeholders (executed — audit.log)
Repo `messages.ts` @9214ff9b (sha256 c1831406…bdba0) copied to own scratch, run with node v24.22.1 under `env -i`, heap 256: 66/66 en+ur parse, 0 parse errors, 0 param mismatches. Negative control (`{komputer}` rename + unclosed brace) → parse_errors=1 mismatches=1, i.e. the checker discriminates.

## 4. Final ur set (shipped @9214ff9b + draft)
- **Manager rule (←):** scanned ALL 24 shipped ur mobile catalogue files (1121 keys) with the draft applied: **0 × U+2192**, 0 ASCII `->`; ← in exactly 4 keys, all menu paths: own_tunnel.verdict_local_network_ios, setup.open_settings, refusal.tunnel_gone.body, refusal.how_to.body. Only other arrows: ↑/↓ in mobile.session.region.* (scroll hints, not paths). **Confirmed.**
- ← is bidi ON, not mirrored; every ← sits between strong chars that resolve R (R|R or L|R → N2 embedding R) in RTL paragraphs, so it points reading-forward. First strong char of all four is AL.
- Quotes: all 15 quoting keys in ur mobile catalogues use “…” (U+201C logically first) per ur.md Punctuation; 0 reversed.
- Labels vs controls: ترتیبات, Radient اکاؤنٹ, فون کی رسائی, “فون کی رسائی ترتیب دیں”, دوبارہ جانچیں, جانچ جاری ہے…, “دوبارہ کوشش کریں” all equal desktop ur (local-operator-ui origin/main e6122214) and mobile.refusal.action.retry.
- 0 bidi controls in the 66 (the 4 own_tunnel FSI/PDI keys elsewhere are the sanctioned allowlist in bidi-controls.test.ts); NFC; Latin digits; sentences end ۔; first strong AL 48 · L 7 · placeholder 11 (unchanged; Latin-initial titles are ur-GAP-C1, code).
- Grammar of new values: معلومات fem. pl. → ہو گئیں / ہو سکیں correct; عارضی طور پر روک دی ہے, اس وقت … اجازت نہیں دی, اس کا نیٹ ورک بحال ہوتے ہی … منسلک ہو جائے گا all natural آپ-register product copy.

## 5. New defects introduced by the draft
None at BLOCKER/MAJOR/MINOR.

| ID | Sev | Keys | Note |
|---|---|---|---|
| ur-R2-N1 | NIT | setup.open_settings, refusal.how_to.body | Same English lead rendered in two shapes («Local Operator کھولیں اور ترتیبات ← … میں “…” منتخب کریں» vs «Local Operator ← ترتیبات ← … کھولیں اور “…” منتخب کریں»). Both correct and ←-consistent; optional alignment on the open_settings shape if either is touched later. No change required. |

## Out of slice (observations, not counted)
- mobile.home.suggestion.phone_access «فون رسائی آن کریں» vs glossary/how_to.title «فون کی رسائی آن کریں» (same English 'Turn on phone access') — pre-existing, for a later ur mobile.home pass.
- Translator notes report desktop ur ui.phone_pairing.popup.*_where still uses →; not verified here (desktop, outside lane).
- ur-GAP-C1 (Alert titleDir) and ur-GAP-C2 ('Your computer' literal) remain code items.

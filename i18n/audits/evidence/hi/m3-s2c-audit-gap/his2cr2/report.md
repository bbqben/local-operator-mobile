# hi — m3-s2c audit gap, ROUND 2 (draft ff2bab43… over mobile @ 9214ff9b)

Auditor: i18n-auditor (lopdev), session db7521df8c9d, model anthropic/claude-opus-5-5 (from the system-prompt "Model:" line; no fallback). Independent of round-1 auditor b61aea064bef and translator f932d8b2ca5f. No MT used; no file edited.

**Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 1 · NIT 1 (both outside the 67-key set; non-gating).

## Controls
- sha256 verified: brief 30da9470…edbda5, draft ff2bab43…40fb, round-1 record d1e297ee…55c2, report b70e7946…60d4b. Inputs copied into own scratch, re-hashed equal.
- Placeholders: repo `messages.ts` (sha c1831406…) parse of en vs FINAL hi for all 67 keys (66 batch + `mobile.settings.section.diagnostics`): 0 mismatches, 0 parse errors, 0 bidi/ZW controls, 0 redaction markers, 0 values identical to English. Negative controls: `{computr}` rename detected; unbalanced `{computer पर` rejected by the parser.
- Scope: draft has exactly 8 keys, all differ from shipped; 7 are round-1 finding keys, the 8th (section header) is named in hi-GAP-1's suggestion and justified in notes.

## Round-1 resolution
| ID | Status | Judgement |
|---|---|---|
| hi-GAP-1 | resolved | copy/copied → डायग्नॉस्टिक्स, byte-equal to desktop `ui.providers.phone.action.copy_diagnostics`; desktop phone block uses ॉ in all 3 strings. Header निदान → डायग्नॉस्टिक्स: still one word (context note), now the same word as the button directly under it (settings.tsx:618, full-width SectionHeader — no fit risk). Loan is acceptable per hi.md ("keep the living English loan"); consistency with button + desktop outweighs निदान's readability. |
| hi-GAP-2 | resolved, variant accepted | Double पर gone; Local Operator is the one needing attention. Dropping "चल रहे" is correct and stronger than the notes say: the body is "Open it there…", so Local Operator may not be running. Same construction as shipped `mobile.computers.refusal.console_title` ("… को … आपके ध्यान की ज़रूरत है"). |
| hi-GAP-3 | resolved, variant accepted | फ़िलहाल = "for now", conveys the momentary pause in fewer words than "कुछ समय के लिए" and avoids a second के लिए. Desktop uses फ़िलहाल in the same register. Renders fine with a name, a host, and the English fallback. |
| hi-GAP-4 | resolved | ख़त्म with nukta; no un-nukta'd खत्म left in mobile hi. |
| hi-GAP-5 | resolved | टनल का पता ∥ desktop फ़ोन का पता. |
| hi-GAP-6 | resolved | "अगर ऐसा ही बना रहे" idiomatic; rest byte-identical; quoted Retry still = `mobile.refusal.action.retry`. |
| hi-GAP-X1 | open, out of scope | Code literal "Your computer" (connection-provider.tsx) — not a catalogue item; owner coder. Re-observed: "Your computer पर Local Operator को…". Not counted here. |

## Final-set consistency (67 keys)
One word per concept: फ़ोन एक्सेस (all), सेटिंग्स / Radient खाता menu paths unchanged and = desktop, “फिर से कोशिश करें” quotes = retry button, Diagnostics now डायग्नॉस्टिक्स on all four Settings keys, attention phrasing = existing mobile pattern. Danda, “ ” quotes, Latin product names intact. No new defects introduced by the draft.

## Findings (non-gating, outside the set)
| ID | Sev | Key | Current | Suggested | Why |
|---|---|---|---|---|---|
| hi-GAP-R2-1 | MINOR | `mobile.signin.diagnostics` (not in set, not changed) | साइन-इन निदान | साइन-इन डायग्नॉस्टिक्स | Now the only noun-sense निदान on mobile; the split moved from inside Settings (one screen) to Settings vs sign-in (different screens) — a net improvement, but align in a later slice and add the translator's proposed glossary row (Diagnostics noun = डायग्नॉस्टिक्स; diagnose verb = निदान करना). |
| hi-GAP-R2-2 | NIT | desktop `ui.chat.pickers.session_panel.session_diagnostics_region` | सत्र डायग्नोस्टिक्स क्षेत्र | सत्र डायग्नॉस्टिक्स क्षेत्र | Desktop's last ो spelling (a11y region label). Desktop-side; record only. |

Not claimed: no device or browser render; fit judged from layout code.

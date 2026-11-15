# hi — m3-s2c audit gap (66 shipped keys, mobile @ 9214ff9b)

Auditor: i18n-auditor (lopdev), session b61aea064bef, model anthropic/claude-opus-5-5 (no fallback). Independent of the translators; no catalogue edited; no MT used.
Brief: lane brief-gap.json sha256 30da9470…edbda5 (verified, own copy identical); redaction-marker hits 0.

**Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 3 · NIT 3 on the hi catalogue values. **Plus one MAJOR code finding (X1) outside the catalogue verdict** — see below; it is a real user-visible defect in hi.

## Controls
1. Brief sha256 matches; `[redacted]` marker count 0.
2. Route: git/scratch reads only; read_public_copy not used (core refuses mobile catalogue paths; sidecars are nested JSON).
3. Placeholders: repo `messages.ts` parse of en+hi for all 66 → 0 mismatches, 0 parse errors; no plural in batch (CLDR hi one = 0,1 / other confirmed with `pluralCategory`). All 13 `{computer}` titles rendered with a name, the English fallback, and `आपका कंप्यूटर`.
4. Glossary/labels: desktop (local-operator-ui origin/main e6122214) ships सेटिंग्स / Radient खाता / फ़ोन एक्सेस / “फ़ोन एक्सेस सेट करें” / चालू करें — every hi menu path (open_settings, how_to.body, tunnel_gone.body) matches. Feature name फ़ोन एक्सेस used in all 13 occurrences. The four quoted “फिर से कोशिश करें” equal `mobile.refusal.action.retry`, the button refusal.ts renders. Radient / Local Operator kept Latin everywhere. Identical English → identical hi within the batch.
5. Fit: retry 3.4×, checking 1.67×, confirm 1.71× — no overflow: refusal actions are full-width stacked buttons, the others sit in full-size buttons. No value identical to English.
6. RTL: n/a (hi). No bidi control characters in any value.

## Findings (catalogue)
| ID | Sev | Key | Current | Suggested | Why |
|---|---|---|---|---|---|
| hi-GAP-1 | MINOR | `mobile.settings.diagnostics.copy; mobile.settings.diagnostics.copied` | डायग्नोस्टिक्स कॉपी करें / डायग्नोस्टिक्स कॉपी हो गए | डायग्नॉस्टिक्स कॉपी करें / डायग्नॉस्टिक्स कॉपी हो गए (desktop spelling); and align out-of-batch mobile.settings.section.diagnostics (निदान) to डायग्नॉस्टिक्स, or both to निदान | Same English 'Diagnostics' renders three ways: section header above this button ships निदान (mobile.settings.section.diagnostics), the button says डायग्नोस्टिक्स, desktop ui.providers.phone.action.copy_diagnostics says डायग्नॉस्टिक्स (ॉ, as in कॉपी/ऑफ़लाइन). Understandable, but a helper comparing screens sees different words. |
| hi-GAP-2 | MINOR | `mobile.refusal.computer_attention.title` | {computer} पर Local Operator पर ध्यान देने की ज़रूरत है। | {computer} पर चल रहे Local Operator को आपके ध्यान की ज़रूरत है। | Two पर in a row ('on X on Local Operator attention is needed') reads clumsily; the second पर makes Local Operator the location rather than the thing needing attention. Renders fine with a name, a URL or the English fallback. |
| hi-GAP-3 | MINOR | `mobile.refusal.suspended.title` | Radient ने {computer} के लिए फ़ोन एक्सेस रोक दिया है। | Radient ने {computer} के लिए फ़ोन एक्सेस कुछ समय के लिए रोक दिया है। | Context: a momentary pause that clears on its own. रोक दिया है alone reads as 'stopped/blocked', which is closer to the disabled/refused causes; the body only partly offsets this. |
| hi-GAP-4 | NIT | `mobile.refusal.balance_out.title` | आपका Radient बैलेंस खत्म हो गया है। | आपका Radient बैलेंस ख़त्म हो गया है। | Style guide hi.md: 'Keep nukta consistently'; the catalogue writes ख़ुद, आख़िरी with nukta. |
| hi-GAP-5 | NIT | `mobile.settings.diagnostics.address` | टनल पता | टनल का पता | Bare noun-noun compound is terse; desktop's parallel label is फ़ोन का पता (ui.providers.phone.address_label). |
| hi-GAP-6 | NIT | `mobile.refusal.suspended.body` | … — अगर ऐसा बना रहे, तो उस पर Local Operator खोलें, … | … — अगर ऐसा ही बना रहे, तो उस पर Local Operator खोलें, … | 'अगर ऐसा बना रहे' is slightly unidiomatic for 'if this lasts'; ही (or 'अगर यह स्थिति बनी रहे') makes it natural. |

## Code finding outside the catalogue verdict
**hi-GAP-X1 — MAJOR — code, all non-en locales (not a hi catalogue value).** src/features/auth/connection-provider.tsx:2588 and :2623 at 9214ff9b (also :2586 'Radient'): subject fallback is the hard-coded English literal "Your computer" → hi renders e.g. 'Your computer पर Local Operator नहीं चल रहा है।'. Suggested: Localize the fallback via a catalogue key. For hi use the bare noun कंप्यूटर (consonant-final masculine: identical in direct and oblique singular), NOT आपका कंप्यूटर (breaks 9 postposition titles: 'आपका कंप्यूटर पर…') nor the existing oblique mobile.computers.added.fallback_name आपके कंप्यूटर (breaks the 4 subject titles offline/relay_wait/wait_network/wait_reconnect: 'आपके कंप्यूटर स्लीप में है'). Evidence: Rendered all 13 {computer} titles with the repo's formatMessage for 'Damian का MacBook', 'Your computer', 'आपका कंप्यूटर' (check.out). Catalogue templates are grammatical for names/URLs/Latin text; the defect is the untranslated code literal and the case trap any single translated fallback would hit.

Grammar around `{computer}` in the hi templates themselves: correct for a user's computer name, a URL, or Latin text — postpositions (के लिए, तक, पर, के) attach to an uninflected name, and the four subject titles agree masculine (रहा है), which suits कंप्यूटर.

## PASS (59 keys)
All other keys in the batch: setup (open_settings, list_updates, check_again, checking), hint.radient_unreachable, diagnostics.tunnel/reason/copy_failed, refusal phone_access_off.*, balance_out.body, console_disabled, provisioning.*, refused.*, offline.*, relay_stopped.*, relay_refused.*, tunnel_gone.*, radient_unreachable.*, relay_wait.*, action.* (7), how_to.*, terminal.*, wait_network.*, wait_reconnect.*, computer_sign_in.*, computer_attention.body, open_console.title, settings account/sign_in_confirm (4), notifications computer_registration (6), chrome.clear_search, home.transcript.needs_answer, session.pending_echo.not_confirmed_plain.

Not claimed: no device or browser render. Fit is judged from layout code, not pixels.

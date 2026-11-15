# fr audit — m3-s2c "audit gap", ROUND 2

- Auditor: i18n-auditor · session b27f79fca9d4 · model anthropic/claude-opus-5-5 (from the session's 'Model:' line; no fallback). Independent of the translator (70879ee98b8d) and the round-1 auditor (796f6be72d5f). No MT used.
- Inputs (sha256 verified, copies in fr-gap-r2/in/): brief 30da9470…edbda5 · draft 7c73ad99…320d6b · round-1 record 92708299…929350 · source 9214ff9b · desktop local-operator-ui origin/main e6122214 (no fetch).
- Route: git/scratch reads; read_public_copy not used (mobile paths refused by core; sidecars nested JSON, not routable). Redaction-marker hits: 0.
- **Verdict: FAILED** — BLOCKER 0 · MAJOR 1 · MINOR 0 · NIT 0. All 13 round-1 findings are resolved; the one MAJOR is new: the out-of-batch chip.

## Mechanical
messages.ts parseMessage (tsx, env -i, 256 MB): 67 keys (66 + chip), 14 draft keys, 0 parse errors, 0 placeholder mismatches; `{computer}` kept in the 4 titles that have it. Negative controls caught: `{computer}`→`{ordinateur}` reported as a mismatch, and an unterminated brace raised RangeError. No bidi controls, no straight apostrophes in the final set. Scope: the 13 flagged keys plus the chip the manager asked for; nothing else changed.

## Round-1 resolution
| ID | Key | Status | Note |
|---|---|---|---|
| fr-GAP-1 | mobile.refusal.phone_access_off.title | resolved | « depuis un téléphone » = desktop ui.providers.phone.heading; value matches round-1 suggestion exactly. |
| fr-GAP-2 | mobile.refusal.suspended.title | resolved | name fixed; « mis en pause » matches context (brief pause, billing fine). |
| fr-GAP-3 | mobile.refusal.console_disabled.title | resolved | « depuis un téléphone » = desktop ui.providers.phone.heading; value matches round-1 suggestion exactly. |
| fr-GAP-4 | mobile.refusal.refused.title | resolved | « depuis un téléphone » = desktop ui.providers.phone.heading; value matches round-1 suggestion exactly. |
| fr-GAP-5 | mobile.refusal.tunnel_gone.title | resolved | « depuis un téléphone » = desktop ui.providers.phone.heading; value matches round-1 suggestion exactly. |
| fr-GAP-6 | mobile.refusal.how_to.title | resolved | « depuis un téléphone » = desktop ui.providers.phone.heading; value matches round-1 suggestion exactly. |
| fr-GAP-7 | mobile.refusal.how_to.body | resolved | label quoted « … »; = desktop ui.providers.phone.action.set_up. |
| fr-GAP-8 | mobile.settings.sign_in_confirm.body | resolved | ’ ×2; « connexion à Radient » disambiguates; meaning preserved. |
| fr-GAP-9 | mobile.refusal.terminal.toggle | resolved | U+202F before ?. |
| fr-GAP-10 | mobile.settings.sign_in_confirm.title | resolved | U+202F before ?. |
| fr-GAP-11 | mobile.refusal.suspended.body | resolved | « sur cet ordinateur »; Réessayer = action.retry. |
| fr-GAP-12 | mobile.notifications.computer_registration.relay_missing | resolved | actor fixed, meaning intact. |
| fr-GAP-13 | mobile.refusal.refused.body | resolved | comma dropped. |

Final-set consistency: there is one feature name, « (l’)accès depuis un téléphone ». It appears in 13 headings, help lines and menu paths and matches the desktop's ui.providers.phone.heading/.stopped. Button names quoted in prose match their controls: Réessayer = action.retry, « Configurer l’accès depuis un téléphone » = desktop .action.set_up, and Paramètres → Compte Radient is the same path as setup.open_settings. Every tap verb is « touchez ». tunnel_gone.title now matches the desktop's « …est désactivé sur… ».

## Finding
| ID | Sev | Key | Current | Suggested |
|---|---|---|---|---|
| fr-R2-1 | MAJOR | mobile.home.suggestion.phone_access | Accès depuis un téléphone | Activez l’accès téléphone |

**Why the chip without its verb does not work at this call site.** This chip comes first in HOME_SUGGESTION_KEYS, so it always shows, at the top of the list. Tapping it puts its label into the composer as the prompt (home-splash.tsx `onPress={() => onPick(label)}`; home-copy.ts: "a suggestion's tap REPLACES the field's text"). A bare noun phrase sent to the agent no longer asks it to turn anything on; it reads more like "tell me about phone access". It also looks like a section heading, while the five chips around it all start with a verb (Créez, Montrez, Configurez, Examinez, Réveillez-moi). The English action has been dropped from a control the user acts on.

**The test limit.** `SUGGESTION_CHAR_BUDGET.fr = 31` (home-copy.ts@9214ff9b), checked by home-copy.test.ts "every suggestion fits its one-line row" (`rendered.length <= 31`, UTF-16 length). The 31 is derived from 24 × the median fr/en length ratio of 1.30. Unlike es, ru and vi (32 each), it was never measured in pixels. « Activez l’accès depuis un téléphone » is 35 characters and fails the test, so the draft's own reasoning holds.

**Fix.** « Activez l’accès téléphone » is 25 characters, so it passes. It is byte-identical to the desktop's own chip `ui.chat.composer.suggestion.phone_access` (origin/main e6122214). It keeps the verb, and the same chip reads the same in both apps. On the manager's rule: the desktop does use « Accès depuis un téléphone » for headings, menu paths and the set-up button, but on this exact surface, the suggestion chip, it uses the short form. Matching that short form follows the desktop's terminology rather than going against it. If the full name must appear on the chip, the only way is a code change: « Activez l’accès depuis un téléphone » plus raising SUGGESTION_CHAR_BUDGET.fr to at least 35, with the width measured at 320 pt. That is outside translation scope. Either option clears the finding; keeping the bare noun does not.

## Observations (not findings)
- The badge mobile.computers.status.suspended still says « suspendu », while refusal.suspended.title now says « mis en pause ». This follows the English split ('suspended' badge vs 'paused' headline). The two English context notes disagree about billing, which is a question for the source copy, not a French defect.
- Outside this batch, the shipped fr catalogues still mix U+0020 and U+202F before « ; : ? », and mobile.notifications.permission.* still use straight '. This is pre-existing and does not gate.

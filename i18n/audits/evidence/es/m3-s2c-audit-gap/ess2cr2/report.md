# es audit — m3-s2c-audit-gap, ROUND 2 (remediation draft review)
Auditor: i18n-auditor, session 00bdf32c5ccb, model anthropic/claude-opus-5-5 (no fallback). Independent of round-1 auditor 37fe02cf811a and translator 442191ede748. Date 2026-11-14.
Inputs (sha256 verified, all match brief): brief-gap.json 30da9470…edbda5 · draft-es.json df6cb5a5…c6f2 · round-1 record 2752516b… · source 9214ff9b.
Route: git/scratch reads; read_public_copy not used.

**Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0.

## 1. Round-1 resolution
| ID | Sev | Status | Evidence |
|---|---|---|---|
| es-GAP-1 | MAJOR | resolved | 8/8 keys computadora→máquina, word-only diff; gender fem→fem, 'sola'/'en ella' still agree. |
| es-GAP-2 | MINOR | resolved | 6/6 keys ordenador→máquina; este→esta ×5, Este→Esta ×2, el→la ×1; no masculine residue. |
| es-GAP-3 | MINOR | resolved | 'Reactiva la máquina … en ella': noun named, agreement independent of {computer}; 'reactivar' sound for wake-from-sleep; style-guide 'wake→despertar' row is the scheduled-wakes feature, translator's distinction accepted. |
| es-GAP-4 | MINOR | resolved | 'sola'→'automáticamente', gender-free. |
| es-GAP-5 | MINOR | resolved | relay_wait.body == radient_unreachable.body == 'Inténtalo de nuevo en un momento.' |
| es-GAP-6 | NIT | resolved | Label quoted with “ ” (es style guide §Punctuation); matches desktop ui.providers.phone.action.set_up; redundant 'Primero' dropped. |
| es-GAP-7 | NIT | resolved | 'Añadir crédito' (infinitive label) / 'Añade crédito' (prose). Desktop ui.providers.phone.action.add_credit and ui.settings.account.settings_page.add_credits = 'Añadir crédito' verified on local-operator-ui origin/main e6122214; core es mobile.setup.* says 'Añade crédito'. balance_out.title keeps 'saldo' (balance) correctly. |

## 2. Draft scope
18 keys changed = 8 (GAP-1) + 6 (GAP-2) + offline/wait_network/relay_wait/add_credit (GAP-3/4/5/7); balance_out.body and how_to.body carry GAP-7/GAP-6 inside GAP-1. Word-level diff old→new per key shows only the flagged edits; 0 extra keys, 0 unflagged changes.

## 3. Placeholders
Shipped `messages.ts` `parseMessage` from 9214ff9b, node v24.22.1 under `env -i`: 66/66 en↔es param sets identical (13 carry `{computer}`). Negative controls: dropped placeholder → detected, renamed `{equipo}` → detected, malformed `{computer x` → RangeError.

## 4. Final 66-key set
- Computer: one name, «máquina», in all 13 values that name it (0 «computadora», 0 «ordenador»). Matches mobile house term (86 shipped occurrences) and desktop es usage («esta máquina» throughout ui.agents/ui.mesh).
- Gender check in every swapped sentence: tu/esta/esa/la máquina; «se volverá a conectar sola» (balance_out, suspended) and «en ella» (suspended, offline) agree with feminine «máquina»; GAP-2 este→esta / el→la all converted, no residue. wait_network.body is gender-free («automáticamente») because its subject is the `{computer}` name.
- Add credit: «Añadir crédito» (label, infinitive per style guide) = desktop `ui.providers.phone.action.add_credit` and `ui.settings.account.settings_page.add_credits` on local-operator-ui origin/main e6122214 (citation verified); prose «Añade crédito» = core es `mobile.setup.action_add_credit`, `tunnel.status.billing_lapsed.detail`. balance_out.title keeps «saldo» for the balance — correct, different concept.
- Identical English → identical es: "Try again in a moment." ×2 now identical.
- Quoted labels match controls: «Reintentar» = mobile.refusal.action.retry; “Configurar el acceso desde el teléfono” = desktop set_up; path segments Ajustes / Cuenta de Radient / Acceso desde el teléfono = desktop es.
- Punctuation: “ ” per es style guide §Punctuation; no straight quotes, double spaces, bidi controls or non-NFC text; end punctuation tracks en on 66/66. Mixed quoted («Configurar…») vs unquoted («Reintentar») labels within the refusal surface is defensible (long multi-word label vs single word) and matches mixed house usage; not a finding.
- Redaction markers: 0 in brief, 0 in draft.

## 5. New defects
None found. «Reactiva» for waking from «reposo» is standard es (wake-from-sleep), distinct from the style guide's «despertar» row for scheduled wakes.

## Out of scope (non-gating)
10 mobile es keys outside this batch still say «ordenador»/«computadoras», including the home button `mobile.chrome.home.connect` «Conectar un ordenador»: mobile.chrome.home.connect, mobile.composer_input.voice.setup_needed, mobile.computers.connect_refused.generic, mobile.notifications.channel.description, mobile.notifications.permission.denied, mobile.notifications.permission.granted, mobile.notifications.permission.undetermined, mobile.team_bridge.gate.connecting, mobile.team_bridge.gate.signed_out_help, mobile.team_bridge.navigation.caption. Same as round-1/translator note; candidate for a follow-on consistency slice.

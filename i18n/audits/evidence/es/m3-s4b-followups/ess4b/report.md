# es — M3 S4b audit (3 keys from PR #264, computadora → máquina)

Auditor: i18n-auditor, session c2cd21ace088, model anthropic/claude-opus-5-5 (initial audit); fallback openai/gpt-6.1-sol completed final verification/provenance after provider-quota switch. Translator session a8d8fe606994 (independent).
Inputs: brief-s4b.json sha256 3a9a8c2f…cfb498699, draft-es.json sha256 b0150c45…82d2afea (both verified). Redaction-marker hits: 0 / 0.

**Verdict: passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 1 NIT.

## Per key
| key | draft | assessment |
|---|---|---|
| preferences.computer_keeps_sending | Tu máquina seguirá enviando notificaciones de agentes hasta que se actualice Local Operator en ella. | Accurate (keeps sending until updated); «Tu … en ella» agrees with feminine «máquina». Only change vs shipped: the noun. |
| preferences.disabled_hint | Requiere un Local Operator más reciente en tu máquina. | Accurate screen-reader hint; «tu» gender-invariant. |
| preferences.update_computer | Para elegir qué notificaciones recibes se necesita un Local Operator más reciente en tu máquina. | Accurate; states a need, promises no available update (per context). |

## Checks
- Term: «máquina» per S2c glossary; matches 113 shipped occurrences, incl. sibling `mobile.notifications.computer_registration.*` («esta máquina»). After apply, 0 «computadora» remain in es mobile.
- Word-level diff vs shipped values: exactly one token per key (computadora→máquina); nothing else changed.
- Placeholders via messages.ts@d73b3ed2: en [] == es [] for 3/3, render == source; negative controls fire (extra `{extra}` detected; `{roto` throws RangeError). Bidi controls 0; NFC.
- Fit: es/en length 1.11, 1.17, 1.16 (all < 1.6); help text / a11y hint, not buttons.
- Brand «Local Operator» kept.

## Findings
- **es-S4B-N1 (NIT, pre-existing, non-gating)** `update_computer`: add comma after fronted purpose clause — «Para elegir qué notificaciones recibes, se necesita…».

## Out of scope (not a finding)
7 shipped es keys still use «ordenador» (chrome.home.connect, composer_input.voice.setup_needed, computers.connect_refused.generic, notifications.channel.description, team_bridge.gate.connecting, team_bridge.gate.signed_out_help, team_bridge.navigation.caption) — already listed in the S2c README follow-ups.

## Provenance / retention
The style guide and glossary were checked after the first assessment; no contrary rule for these three texts. Validator re-executed under fallback: see validator-execution.log (actual stdout/stderr, exit 0). audit.log is a condensed command/output digest, not an exhaustive verbatim transcript. No repo files or ledger modified: lane owner must commit the handoff under the canonical evidence root.

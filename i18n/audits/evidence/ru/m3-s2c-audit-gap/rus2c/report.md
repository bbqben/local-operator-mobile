# ru audit — m3-s2c "audit gap" (66 shipped keys @ 9214ff9b)

Auditor: i18n-auditor, session df512b3fe891, model anthropic/claude-opus-5-5 (no fallback). Independent of the translator.
Brief sha256 30da9470…edbda5 (verified), redaction-marker hits 0. Route: git/scratch reads; read_public_copy not used.

**Verdict: failed (changes_requested)** — BLOCKER 0 · MAJOR 1 (9 keys) · MINOR 1 · NIT 3.

## Checks
- Placeholders: 66/66 identical sets, 0 mismatches, parsed with the repo's own `messages.ts` (negative controls: injected mismatch detected, malformed rejected). No plural/select in slice → CLDR n/a.
- Desktop labels (local-operator-ui origin/main e6122214, no fetch): Настройки → Учётная запись Radient → Доступ с телефона → «Настроить доступ с телефона» — every menu path and quoted control matches. «Повторить» matches `mobile.refusal.action.retry` in all 4 bodies. Feature always «доступ с телефона» (desktop + `mobile.home.suggestion.phone_access`); computer always «компьютер»; alerts «оповещения» consistent across the 6 notification keys; billing «оплата», console «консоль Radient», «Копировать диагностику» all match desktop.
- Prose uses «аккаунт» (mobile's established term, 19 uses) while menu paths quote the desktop label «Учётная запись Radient» — correct split, not a finding.
- Typography: «ёлочки», spaced em dashes, U+2026, ё kept; no bidi controls; no en-identical values. RTL n/a.

## Findings
| ID | Sev | Key | Current | Suggested |
|---|---|---|---|---|
| ru-GAP-1 | MAJOR | `mobile.refusal.suspended.title` | Radient приостановил доступ с телефона к {computer}. | {computer}: Radient приостановил доступ с телефона. |
| ru-GAP-1 | MAJOR | `mobile.refusal.console_disabled.title` | Доступ с телефона к {computer} отключён в вашей консоли Radient. | {computer}: доступ с телефона отключён в вашей консоли Radient. |
| ru-GAP-1 | MAJOR | `mobile.refusal.refused.title` | Radient сейчас не разрешил доступ с телефона к {computer}. | {computer}: Radient пока не разрешает доступ с телефона. |
| ru-GAP-1 | MAJOR | `mobile.refusal.relay_stopped.title` | Local Operator не запущен на {computer}. | {computer}: Local Operator не запущен. |
| ru-GAP-1 | MAJOR | `mobile.refusal.relay_refused.title` | Local Operator на {computer} не принял этот телефон. | {computer}: Local Operator не принял этот телефон. |
| ru-GAP-1 | MAJOR | `mobile.refusal.tunnel_gone.title` | Доступ с телефона на {computer} выключен. | {computer}: доступ с телефона выключен. |
| ru-GAP-1 | MAJOR | `mobile.refusal.computer_sign_in.title` | Local Operator на {computer} просит снова войти в Radient. | {computer}: Local Operator просит снова войти в Radient. |
| ru-GAP-1 | MAJOR | `mobile.refusal.computer_attention.title` | Local Operator на {computer} требует внимания. | {computer}: Local Operator требует внимания. |
| ru-GAP-1 | MAJOR | `mobile.refusal.open_console.title` | Для доступа с телефона к {computer} нужно изменить настройку в консоли Radient. | {computer}: для доступа с телефона нужно изменить настройку в консоли Radient. |
| ru-GAP-2 | MINOR | `mobile.settings.diagnostics.copy_failed` | Не удалось скопировать. Попробуйте ещё раз. | Не скопировано — повторите |
| ru-GAP-3 | NIT | `mobile.refusal.relay_wait.body` | Попробуйте ещё раз через минуту. | Попробуйте ещё раз чуть позже. |
| ru-GAP-4 | NIT | `mobile.refusal.offline.title` | {computer}: спящий режим или нет сети. | {computer} спит или не в сети. |
| ru-GAP-5 | NIT | `mobile.settings.sign_in_confirm.body` | Сначала текущее подключение будет завершено. Если вы не завершите вход, придётся снова подключиться к компьютеру. | Сначала текущее подключение будет завершено. Если прервать вход, придётся снова подключиться к компьютеру. |

**ru-GAP-1** — {computer} is inserted uninflected (refusal.ts copyFor → t(key,{computer: subject}); subject = the reader-chosen computer name, else a fallback noun or an address — connection-provider.tsx:2583-2590). These 9 headlines place it after a preposition that governs an oblique case (к + dative ×4, на + prepositional ×5), so any declinable name the reader gives (e.g. «Домашний ноутбук») renders ungrammatically: «Local Operator не запущен на Домашний ноутбук.», «доступ с телефона к Домашний ноутбук». The translated fallback 'Ваш компьютер' accepted in a later slice (m3-s2b2b record) makes it systematic: «…на Ваш компьютер.». The same file already ships the case-neutral pattern for offline.title («{computer}: …»); use it for all nine so {computer} stays nominative. Alternative only if code drops the noun fallback: appositive «на компьютере «{computer}»». Also folds a calque: refused.title «сейчас не разрешил» (perfective past + 'now') → «пока не разрешает».

**ru-GAP-2** — Replaces the 'Copy diagnostics' button label for ~2 s (settings.tsx:687-694; Button has no labelLines, so it wraps). 43 chars vs en 25 (1.72×) and vs the 22-char resting label: on a 320 pt phone the outline button likely grows to two lines, then shrinks — a visible layout jump. A ~26-char label keeps one line and still says what to do.

**ru-GAP-3** — Same en ('Try again in a moment.') as radient_unreachable.body, which ships «Попробуйте ещё раз чуть позже.»; «через минуту» is more specific than 'in a moment'. Use one rendering.

**ru-GAP-4** — Grammatically safe (nominative) but telegraphic; a verb phrase with {computer} as subject is equally case-safe for a name, the fallback noun or an address and reads as a sentence like its siblings.

**ru-GAP-5** — «завершено … не завершите» repeats the verb; 'stop before sign-in finishes' is an interruption («прервать»), which is also closer to en.

## Cross-locale code observation (not a ru value; not counted)
**ru-GAP-X1** — The {computer} fallback is the hard-coded English literal "Your computer" (and "Radient" when there is no route), never passed through t(). Executed with the repo parser: ru relay_stopped.title renders «Local Operator не запущен на Your computer.». Every locale shows English there. A prior ru record (m3-s2b2b) indicates a translated your_computer key is in flight; once wired, ru-GAP-1 must be fixed in the same change or the headlines read «…на Ваш компьютер». (src/features/auth/connection-provider.tsx:2583-2590 and 2619-2623 @9214ff9b)

## PASS (53 keys)
- `mobile.computers.setup.open_settings`
- `mobile.computers.setup.list_updates`
- `mobile.computers.setup.check_again`
- `mobile.computers.setup.checking`
- `mobile.computers.hint.radient_unreachable`
- `mobile.settings.diagnostics.tunnel`
- `mobile.settings.diagnostics.address`
- `mobile.settings.diagnostics.copy`
- `mobile.refusal.phone_access_off.title`
- `mobile.refusal.phone_access_off.body`
- `mobile.refusal.balance_out.title`
- `mobile.refusal.balance_out.body`
- `mobile.refusal.suspended.body`
- `mobile.refusal.provisioning.title`
- `mobile.refusal.provisioning.body`
- `mobile.refusal.refused.body`
- `mobile.refusal.offline.body`
- `mobile.refusal.relay_stopped.body`
- `mobile.refusal.relay_refused.body`
- `mobile.refusal.tunnel_gone.body`
- `mobile.refusal.radient_unreachable.title`
- `mobile.refusal.radient_unreachable.body`
- `mobile.refusal.relay_wait.title`
- `mobile.refusal.action.how_to`
- `mobile.refusal.action.open_billing`
- `mobile.refusal.action.add_credit`
- `mobile.refusal.action.open_console`
- `mobile.refusal.action.refresh_list`
- `mobile.refusal.action.retry`
- `mobile.refusal.how_to.title`
- `mobile.refusal.how_to.body`
- `mobile.refusal.terminal.toggle`
- `mobile.refusal.terminal.label`
- `mobile.refusal.wait_network.title`
- `mobile.refusal.wait_network.body`
- `mobile.refusal.wait_reconnect.title`
- `mobile.refusal.wait_reconnect.body`
- `mobile.refusal.computer_sign_in.body`
- `mobile.refusal.computer_attention.body`
- `mobile.settings.diagnostics.reason`
- `mobile.settings.account.signed_in_radient`
- `mobile.settings.sign_in_confirm.title`
- `mobile.settings.sign_in_confirm.confirm`
- `mobile.notifications.computer_registration.failed`
- `mobile.notifications.computer_registration.no_token`
- `mobile.notifications.computer_registration.refused`
- `mobile.notifications.computer_registration.registered`
- `mobile.notifications.computer_registration.registering`
- `mobile.notifications.computer_registration.relay_missing`
- `mobile.chrome.clear_search`
- `mobile.home.transcript.needs_answer`
- `mobile.session.pending_echo.not_confirmed_plain`
- `mobile.settings.diagnostics.copied`

# ru audit — mobile.computers (Radient Console brand slice) — rcru1

Auditor: i18n-auditor, session 89755f432f12, model anthropic/claude-opus-5-5 (independent of translator session 0efdae46218c). Date 2026-11-15.
Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 3 NIT.

Mechanical: no repo catalogue validator applies to a scratch draft (local-operator-mobile scripts/i18n/* scan source strings, not draft catalogues), so the independent check in audit.log was run instead: JSON valid, key set identical, placeholders identical to en, brand verbatim (ASCII space, no inflection/suffix/Cyrillic «консол»), NFC, no straight quotes/«!», no ICU in slice.

## Keys

| key | en (proposed) | ru draft | verdict |
|---|---|---|---|
| `mobile.computers.billing_help` | In the Radient Console, open this tunnel's billing settings and activate remote access. | В Radient Console откройте настройки оплаты этого туннеля и включите удалённый доступ. | OK |
| `mobile.computers.disabled_help` | Radient says this tunnel isn't active right now. Check its status in the Radient Console. | По данным Radient, этот туннель сейчас неактивен. Проверьте его состояние в Radient Console. | OK |
| `mobile.computers.harness_help` | In the Radient Console, enable the Local Operator harness for this tunnel. | В Radient Console включите Local Operator для этого туннеля. | OK |
| `mobile.computers.refusal.console_next` | Open the Radient Console to fix it there. Signing in on this phone will not change it. | Откройте Radient Console и устраните проблему там. Повторный вход на этом телефоне ничего не изменит. | OK |
| `mobile.computers.refusal.open_console` | Open the Radient Console | Открыть Radient Console | OK |
| `mobile.computers.route_invalid.not_radient` | That is not a Radient tunnel address. Use the address the Radient Console shows for this computer. | Это не адрес туннеля Radient. Используйте адрес, который Radient Console показывает для этого компьютера. | NIT (see below) |
| `mobile.computers.setup.amount_note` | {amount} is the price the Radient Console shows for this account — {command} refuses anything else, and step 1 of the tunnel guide links to where it is shown. | Вместо {amount} подставьте цену, которую Radient Console показывает для этого аккаунта: другие значения {command} не примет. Где её найти, подсказывает шаг 1 руководства по туннелям. | NIT (see below) |
| `mobile.computers.setup.attach_help` | If you created the tunnel in the Radient Console, attach it by the id shown there. This command is for a tunnel that already exists — it will not create one. | Если вы создали туннель в Radient Console, подключите его по показанному там идентификатору. Эта команда только для уже существующего туннеля — новый она не создаст. | NIT (see below) |

## Findings

- **RU-C-N1 (NIT)** `mobile.computers.route_invalid.not_radient` — current: «Это не адрес туннеля Radient. Используйте адрес, который Radient Console показывает для этого компьютера.». Brand as subject («адрес, который Radient Console показывает») is grammatical: «который» agrees with «адрес» (m. acc.), present-tense «показывает» carries no gender, so the indeclinable brand forces no agreement. Optional, slightly more native and fully preposition-carried: «Используйте адрес, указанный для этого компьютера в Radient Console.»
- **RU-C-N2 (NIT)** `mobile.computers.setup.amount_note` — current: «Вместо {amount} подставьте цену, которую Radient Console показывает для этого аккаунта: другие значения {command} не примет. Где её найти, подсказывает шаг 1 руководства по туннелям.». Same pattern: «которую» agrees with «цену» (f. acc.), not with the brand; correct as drafted. Optional participial variant avoiding brand-as-subject: «Вместо {amount} подставьте цену, указанную для этого аккаунта в Radient Console: другие значения {command} не примет. …»
- **RU-C-N3 (NIT)** `mobile.computers.setup.attach_help` — current: «Если вы создали туннель в Radient Console, подключите его по показанному там идентификатору. Эта команда только для уже существующего туннеля — новый она не создаст.». «по показанному там идентификатору» matches the override ("the id shown there"); «там» has one possible antecedent («в Radient Console»), so no ambiguity. «указанному» is marginally the more usual UI verb for a displayed value; optional: «подключите его по указанному там идентификатору.»

## Notes

Brand verbatim in all 8; case carried by «в»/«Откройте»/«Открыть». Bare company "Radient" («По данным Radient», «туннеля Radient») correctly left as-is. Button «Открыть Radient Console» infinitive per style guide, 23 chars = old ru.

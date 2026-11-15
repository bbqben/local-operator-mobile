# ru audit — mobile.refusal (Radient Console brand slice) — rcru1

Auditor: i18n-auditor, session 89755f432f12, model anthropic/claude-opus-5-5 (independent of translator session 0efdae46218c). Date 2026-11-15.
Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT.

Mechanical: no repo catalogue validator applies to a scratch draft (local-operator-mobile scripts/i18n/* scan source strings, not draft catalogues), so the independent check in audit.log was run instead: JSON valid, key set identical, placeholders identical to en, brand verbatim (ASCII space, no inflection/suffix/Cyrillic «консол»), NFC, no straight quotes/«!», no ICU in slice.

## Keys

| key | en (proposed) | ru draft | verdict |
|---|---|---|---|
| `mobile.refusal.action.open_console` | Open Radient Console | Открыть Radient Console | OK |
| `mobile.refusal.console_disabled.title` | Phone access for {computer} is turned off in your Radient Console. | {computer}: доступ с телефона отключён в Radient Console. | OK |
| `mobile.refusal.open_console.title` | Phone access for {computer} needs a change in your Radient Console. | {computer}: для доступа с телефона нужно изменить настройку в Radient Console. | OK |
| `mobile.refusal.refused.body` | Check it in your Radient Console, or try again. | Проверьте это в Radient Console или попробуйте ещё раз. | OK |

## Findings

None.

## Notes

Dropped possessive (console_disabled.title, and «your» in open_console.title/refused.body already absent in base) is correct: Russian product copy omits redundant possessives, and «вашей Radient Console» would impose feminine attributive agreement on the indeclinable brand. {computer}: heading pattern preserved.

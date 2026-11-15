# ru audit — mobile.settings (Radient Console brand slice) — rcru1

Auditor: i18n-auditor, session 89755f432f12, model anthropic/claude-opus-5-5 (independent of translator session 0efdae46218c). Date 2026-11-15.
Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT.

Mechanical: no repo catalogue validator applies to a scratch draft (local-operator-mobile scripts/i18n/* scan source strings, not draft catalogues), so the independent check in audit.log was run instead: JSON valid, key set identical, placeholders identical to en, brand verbatim (ASCII space, no inflection/suffix/Cyrillic «консол»), NFC, no straight quotes/«!», no ICU in slice.

## Keys

| key | en (proposed) | ru draft | verdict |
|---|---|---|---|
| `mobile.settings.account.delete_help` | Deleting your account happens in the Radient Console, in the browser — this app cannot do it for you. It deletes the account and every tunnel on it. Sessions on your computer are not touched. | Аккаунт удаляется в Radient Console (в браузере) — приложение не может сделать это за вас. Удаляются аккаунт и все его туннели. Сессии на компьютере не затрагиваются. | OK |

## Findings

None.

## Notes

Destructive text: scope preserved (account + every tunnel deleted; computer sessions untouched); only the brand slot changed.

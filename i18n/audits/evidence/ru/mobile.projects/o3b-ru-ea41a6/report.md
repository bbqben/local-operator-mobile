# O3-b ru audit — mobile.projects

Audit ID: `o3b-ru-ea41a6` · Auditor: i18n-auditor (team lopdev), session ea41a6f7ac32, model anthropic/claude-opus-5-5 · Translator session: 480843838cb0 (independent)
Verdict: **passed** — 23 keys, unresolved BLOCKER/MAJOR: 0

Read: ru style guide, glossary, English + context (brief, hashes re-derived from git at 39b5e3e5), draft, shipped ru mobile.common/projects/sidebar/session/relay.chrome (+ chrome, home, agent_avatar, transcript, notifications for terms).

Mechanical: keys 1:1, placeholder sets identical, ICU plural arms one/few/many/other where plural, `#` kept, NFC, «ёлочки», single … char, no capital «Вы», 0 redaction markers. See audit.log.

## Findings

### RU-P1 — MINOR — `mobile.projects.list.load_failed, mobile.projects.detail.load_failed`
- Current: Сейчас не удалось загрузить ваши проекты. / Сейчас не удалось загрузить этот проект.
- Problem: Leading «Сейчас» + perfective past reads slightly off in Russian and departs from the shipped ru convention for the same English pattern ("We couldn't read X just now." -> «Не удалось прочитать X.», mobile.home.folders_read_failed, models_read_failed, schedules.read_unreachable; 0 shipped values start «Сейчас не удалось»). «ваши» is avoidable per the ru guide's impersonal preference. Meaning is correct.
- Replacement: `mobile.projects.list.load_failed` → «Не удалось загрузить проекты.»; `mobile.projects.detail.load_failed` → «Не удалось загрузить этот проект.»

### RU-P2 — MINOR — `mobile.projects.milestone.name_placeholder`
- Current: срез релиза
- Problem: «срез» is release-train jargon at best; most readers parse «срез релиза» as "a cross-section of the release". The ru style guide (Wave-2 calls) already rejected «срез» as a calque for "slice"; a placeholder example should be a phase every reader recognises. 11/20 fits; the replacement fits too (14/20).
- Replacement: `mobile.projects.milestone.name_placeholder` → «заморозка кода»


## Checked and accepted (not findings)

- empty.next: {action} quoted «» after «кнопкой», reads naturally with «Новый проект».
- sessions_empty «сессии» matches shipped projects terms; milestones_empty «Вех нет.» matches milestones.none.
- milestone.name «Имя» matches create.name / milestone_slash_note.
- milestone.remove «Удалить» matches shipped remove_milestone_body (the milestone IS deleted).
- target_date_placeholder «ГГГГ-ММ-ДД» keeps ISO order, 10 chars.
- reopen_hint «Возобновляет веху» matches shipped write_receipt «Возобновлена веха».

# O3-b ru audit — mobile.sidebar

Audit ID: `o3b-ru-ea41a6` · Auditor: i18n-auditor (team lopdev), session ea41a6f7ac32, model anthropic/claude-opus-5-5 · Translator session: 480843838cb0 (independent)
Verdict: **passed** — 15 keys, unresolved BLOCKER/MAJOR: 0

Read: ru style guide, glossary, English + context (brief, hashes re-derived from git at 39b5e3e5), draft, shipped ru mobile.common/projects/sidebar/session/relay.chrome (+ chrome, home, agent_avatar, transcript, notifications for terms).

Mechanical: keys 1:1, placeholder sets identical, ICU plural arms one/few/many/other where plural, `#` kept, NFC, «ёлочки», single … char, no capital «Вы», 0 redaction markers. See audit.log.

## Findings

### RU-S1 — MINOR — `mobile.sidebar.tags.load_failed_body`
- Current: Сейчас не удалось загрузить список категорий. Повторите попытку чуть позже.
- Problem: Same «Сейчас не удалось» departure from the shipped convention as RU-P1. Second sentence matches shipped «Повторите попытку чуть позже.» exactly.
- Replacement: `mobile.sidebar.tags.load_failed_body` → «Не удалось загрузить список категорий. Повторите попытку чуть позже.»

### RU-S2 — MINOR — `mobile.sidebar.row.asks_not_blocker`
- Current: {asks}, работу не блокирует
- Problem: The singular verb has no stated subject; after a plural count ("5 вопросов, работу не блокирует") it reads as an agreement slip to a screen-reader listener, and it says what the asks do not do rather than the context's point, that the agent keeps working and is NOT waiting. Placeholder correct.
- Replacement: `mobile.sidebar.row.asks_not_blocker` → «{asks}, агент продолжает работу»

### RU-S3 — MINOR — `mobile.sidebar.row.asks`
- Current: many {# вопросов}
- Problem: The many arm renders 11 chars for every two-digit many-count ("10 вопросов"…"20 вопросов", "25 вопросов") vs the ~10 hint; single-digit counts and all other arms fit (≤10). Verified non-clipping: the chip is `shrink-0 text-mono-sm` (src/ui/components/list-row.tsx L317-325), so the title column absorbs it. No idiomatic shorter form: «вопр.» is not a conventional abbreviation.
- Replacement: `mobile.sidebar.row.asks` (no change) {count, plural, one {# вопрос} few {# вопроса} many {# вопросов} other {# вопроса}}

### RU-S4 — NIT — `mobile.sidebar.tags.remove_all, remove_all_title, remove_all_confirm`
- Current: Снять все теги / Снять все теги? / Снять
- Problem: Cross-surface divergence: the core web relay ships «удалить все теги» (relay.session.tags.remove_all, ~/local-operator). The mobile draft's «Снять» is the more accurate verb (unassign; the body says categories survive), so the draft should stay; the web string is the one to align later, outside this slice.
- Replacement: `mobile.sidebar.tags.remove_all` (no change) Снять все теги


## Checked and accepted (not findings)

- «беседа» is the sidebar conversation term; row.new «новая» agrees (cf. chrome.drawer.open_count).
- announcement «Теги» = relay.chrome.row.tags.
- empty_next «Создаются на компьютере.» 24/24, elliptical but clear after the headline.
- asks «вопрос» = relay.transcript.label.ask; todos «задача» per ru guide (job→задание keeps задача for todos); other arm genitive singular correct.
- remove_all_body conveys the categories are not deleted; «приложение для компьютера» = mobile.agent_avatar.edit_hint.

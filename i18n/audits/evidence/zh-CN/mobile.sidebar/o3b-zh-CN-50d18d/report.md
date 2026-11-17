# O3-b audit: zh-CN / mobile.sidebar (o3b-zh-CN-50d18d)

- Verdict: **passed** (0 BLOCKER, 0 MAJOR). Findings: ZH-1 MINOR, ZH-2 MINOR, ZH-3 MINOR, ZH-6 NIT, ZH-7 NIT
- Auditor: i18n-auditor (lopdev), session 50d18d99f4dc, model anthropic/claude-opus-5-5 (system prompt; no fallback). Independent from translator session 2c2bf5244f04.
- Inputs: draft sha256 a379691b714b9a61a972386540c0414277611ef3aed17a76fa9bfd02433cbf57; brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe; source 39b5e3e5343dc7302b99f731e5806cf82525d346.
- Read route: ordinary file reads and `git show`. read_public_copy was not used because it refuses mobile catalogue paths.
- Redaction marker hits: 0 in the draft and 0 in the en/context files. The brief's 2 regex hits are self-matches inside its own pattern field.
- Mechanical checks: 40/40 keys present, none extra. Placeholder sets match. ICU parses, with only the CLDR `other` arm and `#` kept. NFC. Full-width punctuation with “” quotes. The repo validator was not run; see audit.log for the stand-in checker and its controls.

## Findings
**ZH-1 — MINOR** `mobile.sidebar.row.todos`
- Current: `{count, plural, other {# 项待办}}`
- Problem: The chip counts the conversation’s todo list, which the shipped zh-CN catalogue already calls 任务 on the surfaces this chip leads to: mobile.session.region.label_todos “任务” (en context: “Reuse the shipped tasks term”), relay.chrome.session.tray.tasks “任务{done}/{total}”, mobile.session.sheet_title.status “任务和智能体”. The translator note says 待办 keeps the chip “distinct from 任务 used elsewhere”, but that 任务 is this same todo list. 待办 is understandable, so MINOR, not MAJOR.
- Proposed: `{count, plural, other {# 项任务}}`

**ZH-2 — MINOR** `mobile.sidebar.tags.empty_next`
- Current: `请在桌面端创建。`
- Problem: Two things. (a) 桌面端 does not match 桌面应用, the term used in the same sheet (tags.remove_all_body), in mobile.agent_avatar.edit_hint and in core relay.session.tags.empty_hint for the same feature. (b) 请 is not in the source (“Created on desktop.”), and the zh-CN style guide says to use 请 only where the English says please.
- Proposed: `需在桌面应用中创建。 (10 chars / 20 cells, within the 24 hint)`

**ZH-3 — MINOR** `mobile.sidebar.row.agents`
- Current: `{count, plural, other {# 个智能体}}`
- Problem: Fit: at count=99 the value is 7 chars but 11 cells (CJK glyphs are double width in the monospace meta strip), against the ~10 hint. The overflow is 1 cell, only at two-digit counts, and the context says this strip yields at large text, so nothing gets cut off. Dropping 个 to save space would not read naturally.
- Proposed: `Keep the current wording. No shorter idiomatic form exists.`

**ZH-6 — NIT** `mobile.sidebar.tags.remove_all_body`
- Current: `此操作会清除此对话上的所有标签类别。类别本身仍保留在桌面应用中。`
- Problem: 此…此 repeats, and 对话上的 is slightly stiff.
- Proposed: `这会清除此对话的所有标签类别。类别本身仍保留在桌面应用中。`

**ZH-7 — NIT** `mobile.sidebar.tags.{remove_all_body,load_failed_title,load_failed_body,empty_headline}`
- Current: `标签类别 / 类别`
- Problem: The translator note says no term for tag categories existed. Core zh-CN has one for the same tags sheet on the desktop relay: relay.session.tags.empty “尚无标签分类” (分类). Core is itself mixed, though: wire.errors.desktop.library_tag_category uses 标签类别. So 标签类别 is defensible and consistent within this batch.
- Proposed: `No change required. If the corpus standardizes, use one term (标签类别 or 标签分类) in core and mobile.`

## Keys audited (15)
| key | zh-CN |
|---|---|
| mobile.sidebar.tags.remove_all | 移除所有标签 |
| mobile.sidebar.tags.remove_all_title | 要移除所有标签吗？ |
| mobile.sidebar.tags.remove_all_body | 此操作会清除此对话上的所有标签类别。类别本身仍保留在桌面应用中。 |
| mobile.sidebar.tags.remove_all_confirm | 移除 |
| mobile.sidebar.tags.saving | 正在保存… |
| mobile.sidebar.tags.load_failed_title | 标签类别未能加载 |
| mobile.sidebar.tags.load_failed_body | 暂时无法读取类别列表。请稍后重试。 |
| mobile.sidebar.tags.empty_headline | 还没有标签类别。 |
| mobile.sidebar.tags.empty_next | 请在桌面端创建。 |
| mobile.sidebar.tags.announcement | 标签：{names} |
| mobile.sidebar.row.new | 新 |
| mobile.sidebar.row.asks | {count, plural, other {# 个问题}} |
| mobile.sidebar.row.asks_not_blocker | {asks}，不阻塞智能体工作 |
| mobile.sidebar.row.agents | {count, plural, other {# 个智能体}} |
| mobile.sidebar.row.todos | {count, plural, other {# 项待办}} |

_These are the auditor's notes, not an execution log; audit.log has the command output._

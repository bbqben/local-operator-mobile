# O3-b audit: zh-CN / mobile.projects (o3b-zh-CN-50d18d)

- Verdict: **passed** (0 BLOCKER, 0 MAJOR). Findings: ZH-4 NIT, ZH-5 NIT
- Auditor: i18n-auditor (lopdev), session 50d18d99f4dc, model anthropic/claude-opus-5-5 (system prompt; no fallback). Independent from translator session 2c2bf5244f04.
- Inputs: draft sha256 a379691b714b9a61a972386540c0414277611ef3aed17a76fa9bfd02433cbf57; brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe; source 39b5e3e5343dc7302b99f731e5806cf82525d346.
- Read route: ordinary file reads and `git show`. read_public_copy was not used because it refuses mobile catalogue paths.
- Redaction marker hits: 0 in the draft and 0 in the en/context files. The brief's 2 regex hits are self-matches inside its own pattern field.
- Mechanical checks: 40/40 keys present, none extra. Placeholder sets match. ICU parses, with only the CLDR `other` arm and `#` kept. NFC. Full-width punctuation with “” quotes. The repo validator was not run; see audit.log for the stand-in checker and its controls.

## Findings
**ZH-4 — NIT** `mobile.projects.empty.next`
- Current: `点按“{action}”创建一个，或让智能体帮你创建。`
- Problem: The tap verb differs from the rest of mobile zh-CN: 轻点 appears in 5 shipped strings (mobile.session.pending_echo.*, mobile.refusal.*, mobile.computers.own_tunnel.verdict_local_network_ios), while 点按 appears in 1.
- Proposed: `轻点“{action}”创建一个，或让智能体帮你创建。`

**ZH-5 — NIT** `mobile.projects.list.load_failed`
- Current: `暂时无法读取你的项目。`
- Problem: The style guide prefers dropping pronouns (verb-forward phrasing). 你的 adds nothing here.
- Proposed: `暂时无法读取项目。`

## Keys audited (23)
| key | zh-CN |
|---|---|
| mobile.projects.list.load_failed | 暂时无法读取你的项目。 |
| mobile.projects.empty.headline | 还没有项目。 |
| mobile.projects.empty.next | 点按“{action}”创建一个，或让智能体帮你创建。 |
| mobile.projects.detail.gone | 该项目已不存在。 |
| mobile.projects.detail.title_fallback | 项目 |
| mobile.projects.detail.load_failed | 暂时无法读取该项目。 |
| mobile.projects.detail.milestones_empty | 暂无里程碑。 |
| mobile.projects.detail.sessions_empty | 暂无关联会话。 |
| mobile.projects.detail.delete | 删除项目 |
| mobile.projects.detail.delete_confirm | 删除 |
| mobile.projects.milestone.add | 添加里程碑 |
| mobile.projects.milestone.edit_title | 编辑里程碑 |
| mobile.projects.milestone.add_submit | 添加 |
| mobile.projects.milestone.remove | 移除里程碑 |
| mobile.projects.milestone.remove_confirm | 移除 |
| mobile.projects.milestone.name | 名称 |
| mobile.projects.milestone.name_placeholder | 版本冻结 |
| mobile.projects.milestone.target_date | 目标日期 |
| mobile.projects.milestone.target_date_placeholder | YYYY-MM-DD |
| mobile.projects.milestone.target_date_help | 清空输入框即可移除日期。 |
| mobile.projects.milestone.reopen_hint | 重新打开该里程碑 |
| mobile.projects.milestone.complete_hint | 将该里程碑标记为已完成 |
| mobile.projects.milestone.edit_label | 编辑“{name}” |

_These are the auditor's notes, not an execution log; audit.log has the command output._

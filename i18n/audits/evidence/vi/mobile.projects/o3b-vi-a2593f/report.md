# O3-b audit — vi / mobile.projects — o3b-vi-a2593f

Verdict: **passed** · unresolved BLOCKER/MAJOR: 0 · keys: 23
Auditor: i18n-auditor (team lopdev), session a2593f163587, model anthropic/claude-opus-5-5 (harness 'Model:' line; no fallback). Translator session 9bc4a4716d1c, so this audit is independent.
Inputs: draft sha256 9bb41ba8…1333 (source commit 39b5e3e5); brief sha256 63351e7e…ddfe; vi style guide e4901497…; glossary 0eb34437…
Mechanical (see audit.log): key set equal (40/40 overall); placeholder sets equal; every value parses with the repo's parseMessage; plural arms are `other` only, which is the full CLDR set for vi; NFC; no ASCII "..."; redaction hits: 0 in the draft. The brief's own `redaction_scan.pattern` field matched itself twice and was excluded.

## Judgement
Accurate and consistent with shipped vi projects (dự án, mốc, phiên, Xóa for destructive delete/remove matching remove_milestone_body). Error lines follow shipped «Vừa rồi không đọc được…» pattern. YYYY-MM-DD kept: allowed by brief rule 3 (same ISO order); NNNN-TT-NN would be ambiguous (Năm/Ngày). name_placeholder 18/20 lowercase, idiomatic.

## Findings
### VI-P1 — NIT — `mobile.projects.empty.next`
- Current: Tạo dự án bằng nút “{action}”, hoặc nhờ một tác nhân mở giúp.
- Problem: «mở» with the object dropped can read as opening an existing project; the sentence is about starting a new one. Placeholder/quotes correct; renders «…nút “Dự án mới”…».
- Proposed: Tạo dự án bằng nút “{action}”, hoặc nhờ một tác nhân tạo giúp.

### VI-P2 — NIT — `mobile.projects.milestone.target_date_help`
- Current: Để trống ô này để xóa ngày.
- Problem: Two «để» in one short clause (leave-empty + in-order-to) reads slightly clumsy.
- Proposed: Để trống ô này nếu muốn bỏ ngày.

## Keys audited (rendered length / width hint)
| key | en | vi | len |
|---|---|---|---|
| `mobile.projects.list.load_failed` | We couldn't read your projects just now. | Vừa rồi không đọc được các dự án của bạn. | 41 |
| `mobile.projects.empty.headline` | No projects yet. | Chưa có dự án nào. | 18/32 |
| `mobile.projects.empty.next` | Start one with {action}, or ask an agent to open one. | Tạo dự án bằng nút “{action}”, hoặc nhờ một tác nhân mở giúp. | 61 |
| `mobile.projects.detail.gone` | That project is no longer there. | Dự án đó không còn khả dụng. | 28 |
| `mobile.projects.detail.title_fallback` | Project | Dự án | 5/16 |
| `mobile.projects.detail.load_failed` | We couldn't read that project just now. | Vừa rồi không đọc được dự án đó. | 32 |
| `mobile.projects.detail.milestones_empty` | No milestones. | Chưa có mốc nào. | 16/24 |
| `mobile.projects.detail.sessions_empty` | No sessions linked. | Chưa liên kết phiên nào. | 24/28 |
| `mobile.projects.detail.delete` | Delete project | Xóa dự án | 9/24 |
| `mobile.projects.detail.delete_confirm` | Delete | Xóa | 3/12 |
| `mobile.projects.milestone.add` | Add milestone | Thêm mốc | 8/24 |
| `mobile.projects.milestone.edit_title` | Edit milestone | Sửa mốc | 7/24 |
| `mobile.projects.milestone.add_submit` | Add | Thêm | 4/12 |
| `mobile.projects.milestone.remove` | Remove milestone | Xóa mốc | 7/24 |
| `mobile.projects.milestone.remove_confirm` | Remove | Xóa | 3/12 |
| `mobile.projects.milestone.name` | Name | Tên | 3 |
| `mobile.projects.milestone.name_placeholder` | release cut | chốt bản phát hành | 18/20 |
| `mobile.projects.milestone.target_date` | Target date | Ngày mục tiêu | 13/20 |
| `mobile.projects.milestone.target_date_placeholder` | YYYY-MM-DD | YYYY-MM-DD | 10 |
| `mobile.projects.milestone.target_date_help` | Empty the box to clear the date. | Để trống ô này để xóa ngày. | 27 |
| `mobile.projects.milestone.reopen_hint` | Reopens the milestone | Mở lại mốc này | 14 |
| `mobile.projects.milestone.complete_hint` | Marks the milestone complete | Đánh dấu mốc này là hoàn thành | 30 |
| `mobile.projects.milestone.edit_label` | Edit {name} | Sửa {name} | 10 |

_report.md holds the auditor's notes, not an execution log; audit.log holds the commands that were run and their output._

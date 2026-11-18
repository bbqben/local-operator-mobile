# O3-b audit — vi / mobile.sidebar — o3b-vi-a2593f

Verdict: **passed** · unresolved BLOCKER/MAJOR: 0 · keys: 15
Auditor: i18n-auditor (team lopdev), session a2593f163587, model anthropic/claude-opus-5-5 (harness 'Model:' line; no fallback). Translator session 9bc4a4716d1c, so this audit is independent.
Inputs: draft sha256 9bb41ba8…1333 (source commit 39b5e3e5); brief sha256 63351e7e…ddfe; vi style guide e4901497…; glossary 0eb34437…
Mechanical (see audit.log): key set equal (40/40 overall); placeholder sets equal; every value parses with the repo's parseMessage; plural arms are `other` only, which is the full CLDR set for vi; NFC; no ASCII "..."; redaction hits: 0 in the draft. The brief's own `redaction_scan.pattern` field matched itself twice and was excluded.

## Judgement
Translator question on Nhãn vs Thẻ: «Nhãn» is right for this sheet. It is the conversation tag-category feature, which core vi names «nhãn» throughout (tui.tags.*, relay.session.tags.*, relay.chrome.row.tags) and brief rule 5 requires matching relay.chrome.row.tags. «Thẻ» belongs to project tags and library tags, which are separate features. «danh mục» for category agrees with core «danh mục nhãn». Plural: other-only is correct (Intl vi → [other]; style guide §Plurals). empty_next «Tạo trên máy tính.» 18/24 is acceptable; «máy tính» is the shipped term for the paired computer.

## Findings
### VI-S1 — MINOR — `mobile.sidebar.row.asks_not_blocker`
- Current: {asks}, không cản trở
- Problem: Screen-reader output «2 câu hỏi, không cản trở» does not say WHAT is not obstructed; context requires the listener to understand the agent keeps working and is not waiting. Meaning recoverable, not wrong.
- Proposed: {asks}, tác nhân vẫn chạy tiếp

### VI-S2 — MINOR — `mobile.sidebar.tags.remove_all, remove_all_title, remove_all_confirm, remove_all_body`
- Current: Gỡ tất cả nhãn / Gỡ tất cả nhãn? / Gỡ / Thao tác này gỡ mọi danh mục…
- Problem: Same action on the same feature is «bỏ» in shipped core vi (relay.session.tags.remove_all «bỏ tất cả nhãn», tui.tags.removed «Đã bỏ nhãn»); mobile vi has no «gỡ» anywhere. «Gỡ» is idiomatic and non-destructive (correctly avoids «Xóa»), so cross-surface consistency only.
- Proposed: remove_all: «Bỏ tất cả nhãn»; remove_all_title: «Bỏ tất cả nhãn?»; remove_all_confirm: «Bỏ»; remove_all_body: «Thao tác này bỏ mọi danh mục khỏi cuộc trò chuyện này. Bản thân các danh mục vẫn còn trong ứng dụng máy tính.»

### VI-S3 — NIT — `mobile.sidebar.row.agents`
- Current: {count, plural, other {# tác nhân}}
- Problem: «99 tác nhân» = 11 chars vs ~10 hint (1-digit = 10). Chip yields at large text per context; no shorter correct vi term (glossary agent → tác nhân).
- Proposed: No change.

## Keys audited (rendered length / width hint)
| key | en | vi | len |
|---|---|---|---|
| `mobile.sidebar.tags.remove_all` | Remove all tags | Gỡ tất cả nhãn | 14/24 |
| `mobile.sidebar.tags.remove_all_title` | Remove all tags? | Gỡ tất cả nhãn? | 15/28 |
| `mobile.sidebar.tags.remove_all_body` | This clears every category from this conversation. The categories themselves stay in the desktop app. | Thao tác này gỡ mọi danh mục khỏi cuộc trò chuyện này. Bản thân các danh mục vẫn còn trong ứng dụng máy tính. | 109 |
| `mobile.sidebar.tags.remove_all_confirm` | Remove | Gỡ | 2/12 |
| `mobile.sidebar.tags.saving` | Saving… | Đang lưu… | 9/12 |
| `mobile.sidebar.tags.load_failed_title` | Your categories didn't load | Không tải được danh mục của bạn | 31/32 |
| `mobile.sidebar.tags.load_failed_body` | We couldn't read the list of categories just now. Try again in a moment. | Vừa rồi không đọc được danh sách danh mục. Hãy thử lại sau giây lát. | 68 |
| `mobile.sidebar.tags.empty_headline` | No categories yet. | Chưa có danh mục nào. | 21/28 |
| `mobile.sidebar.tags.empty_next` | Created on desktop. | Tạo trên máy tính. | 18/24 |
| `mobile.sidebar.tags.announcement` | Tags: {names} | Nhãn: {names} | 13 |
| `mobile.sidebar.row.new` | new | mới | 3/8 |
| `mobile.sidebar.row.asks` | {count, plural, one {# ask} other {# asks}} | {count, plural, other {# câu hỏi}} | 34/10 |
| `mobile.sidebar.row.asks_not_blocker` | {asks}, not a blocker | {asks}, không cản trở | 21 |
| `mobile.sidebar.row.agents` | {count, plural, one {# agent} other {# agents}} | {count, plural, other {# tác nhân}} | 35/10 |
| `mobile.sidebar.row.todos` | {count, plural, one {# todo} other {# todos}} | {count, plural, other {# tác vụ}} | 33/10 |

_report.md holds the auditor's notes, not an execution log; audit.log holds the commands that were run and their output._

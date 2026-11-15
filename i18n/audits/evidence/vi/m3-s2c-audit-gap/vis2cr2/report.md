# vi — m3-s2c audit gap, round 2 (independent)
Auditor: i18n-auditor · session ef29a5921e99 · anthropic/claude-opus-5-5 (no fallback). Independent of the translator (c0230879f401) and the round-1 auditor (50f759c57419).
Inputs: the brief, draft and round-1 sha256 values matched the brief; details in record.json and audit.log. Desktop reference: local-operator-ui origin/main e612221450.

**Verdict: passed.** BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0. Round-1 blocker/major findings left open: 0 of 7.

## Mechanical
- The draft changes exactly the 13 keys flagged as GAP-1 to GAP-13. It adds no keys, drops none and changes nothing outside those findings.
- Placeholders: all 66 final values parse with repo messages.ts. Their parameter sets match English (13 keys carry `{computer}`). Negative controls both worked: dropping `{computer}` was detected, and `Bad {computer` made the parser throw.
- No bidi controls and no redaction markers. End punctuation matches English. No straight or curly quotes were introduced.

## Round-1 resolution
| ID | Status | Note |
|---|---|---|
| vi-GAP-1 | resolved | feature name now 'Truy cập từ điện thoại' = desktop ui.providers.phone.heading |
| vi-GAP-2 | resolved | 'Quyền' dropped |
| vi-GAP-3 | resolved | 'Quyền' dropped; 'vào {computer}' kept |
| vi-GAP-4 | resolved | term fixed + natural 'kiểm tra xem … đã bật chưa' |
| vi-GAP-5 | resolved | identical pattern to desktop ui.providers.phone.stopped |
| vi-GAP-6 | resolved | = desktop ui.chat.composer.suggestion.phone_access 'Bật truy cập từ điện thoại' |
| vi-GAP-7 | resolved | term fixed; 'vào {computer}' now matches console_disabled.title (same en); 'của bạn' restored |
| vi-GAP-8 | resolved | 'nạp thêm tín dụng' = desktop low_credits_dialog.get_more_credits |
| vi-GAP-9 | resolved | 'Nạp tín dụng' = desktop ui.providers.phone.action.add_credit |
| vi-GAP-10 | resolved_with_variation_accepted | doubled 'trước' removed. Kept 'bất cứ thứ gì' over R1's 'bất cứ tính năng nào': sound — en says 'anything', and desktop ui.providers.phone.consent shows activation sets up a subscription, reserves an address and starts a connector, so 'tính năng' would narrow the meaning. Reads naturally. |
| vi-GAP-11 | resolved | 'bật tính năng này trong' names the antecedent |
| vi-GAP-12 | resolved | 'hiện không chạy' also matches shipped mobile.computers.refusal wording |
| vi-GAP-13 | resolved | past-negative calque removed |
| vi-GAP-14 | rejection_sound | R1 itself recommended keep; 'Sao chép thông tin chẩn đoán' is byte-identical to desktop ui.providers.phone.action.copy_diagnostics (same en 'Copy diagnostics'), so per the desktop-reference rule it is correct; full-size outline Button wraps rather than clips. Narrow-phone render is design/QA's, not catalogue. |

## Translator choices I was asked to judge
- **GAP-10, different wording (accepted).** The doubled "trước" is gone, so the substance of the finding is fixed. The translator kept "bất cứ thứ gì" ("anything") and did not use round 1's "bất cứ tính năng nào" ("any feature"). That reason holds. English says "anything", and desktop `ui.providers.phone.consent` shows that activation sets up a subscription, reserves an address and starts a connector. That is more than a "tính năng" (feature), so "tính năng" would narrow the meaning. "Bạn sẽ thấy giá trước khi bất cứ thứ gì được bật." reads naturally.
- **GAP-14, rejected (sound).** Round 1's own suggestion was to keep the text, so no change was due. The desktop reference settles it: `ui.providers.phone.action.copy_diagnostics` = "Sao chép thông tin chẩn đoán" for the same English, "Copy diagnostics". The shortened "Sao chép chẩn đoán" would split the term across apps. The full-size Button wraps text rather than clipping it.

## Final set consistency (66 keys)
- One name for the feature, "truy cập từ điện thoại", used in 12 keys with no "Quyền truy cập" left. The title "Bật truy cập từ điện thoại" and the menu path / "Thiết lập truy cập từ điện thoại" match desktop `ui.chat.composer.suggestion.phone_access`, `ui.providers.phone.heading` and `.action.set_up`.
- Identical English gets identical Vietnamese: "Phone access for {{computer}}" → "Truy cập từ điện thoại vào {{computer}}" in both keys; "Try again in a moment." gets the same text in both keys.
- Credit term: "Nạp tín dụng" / "nạp thêm tín dụng" match desktop. The "Thử lại" quoted in prose matches the `action.retry` button.

## Non-gating observation (pre-existing, outside this slice)
- vi-R2-O1: mobile vi uses "bảng điều khiển Radient" in 12 strings across 4 catalogues; desktop vi uses "Radient Console" ("Mở Radient Console"). Each app is consistent with itself. Changing only these 4 keys would split the mobile app, so aligning the two is an app-wide terminology decision for the manager, not a finding against this draft.

# zh-CN audit — mobile.notifications (O3-a) — o3a-zhCN-notif

Auditor: i18n-auditor (lopdev), session 49772dd20be0, model anthropic/claude-opus-5-5. Translator session bb79330944ae (independent).
Draft route: direct read of the translator scratchpad (sha256 8ecdc5ced43efc97a73636f911d5fa1de14e8a5e12ad2f81c3a17f3e25eeb128 matches the attested hash); the relayed copy is dict-equal. Canonical sha256 cde876eefdc47d382c7e317105ca2f929afcf0c091f5e80bfe6d58a98d4d66ee.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

| key | en | zh-CN | cells (sample) | mechanical |
|---|---|---|---|---|
| `mobile.notifications.section.waiting` | Waiting on you | 等待你处理 | 10 | OK |
| `mobile.notifications.section.waiting_count` | Waiting on you · {count} | 等待你处理 · {count} | 15 | OK |
| `mobile.notifications.detail.title` | Notification | 通知 | 4 | OK |
| `mobile.notifications.detail.section_notification` | Notification | 通知 | 4 | OK |
| `mobile.notifications.detail.section_links` | Links | 链接 | 4 | OK |
| `mobile.notifications.detail.section_message` | Message | 消息 | 4 | OK |

## Findings
- **ZH-N1 NIT** `mobile.notifications.detail.section_notification`: current `通知`. The screen title (detail.title) directly above is also 通知, so the screen shows the same word twice. English does the same ("Notification"/"Notification"), so this is optional. **Suggested:** 通知内容

Consistency checked against the shipped zh-CN catalogue @26663e18 (e.g. sidebar.section.today 今天, relay.chrome.session.subtitle.waiting 等待你处理, relay.chrome.drawer.projects 项目, settings.section.* 连接/外观/关于, the " · " separator in library.browse.filters_count) and the glossary (唤醒, 监控, 项目, 会话).

## Round 2 addendum (2026-11-16)

Scope: only the remediated keys. The draft file sha256 is now 953d337ff4c227f7f8d2ad7d95685af274bf9d15788a5907bda97499569e79a0 (matches the attested hash), canonical sha256 f8c03d70917154568bb219ac124128b7a027a13384ef9ee0207c9e277b129f81. The draft changes exactly 2 keys in total (ZH-T1, ZH-N1); the other 38 are byte-identical to round 1. The round-1 baseline was rebuilt from the relayed copy and verified by its canonical sha256 cde876…, because the translator's file was overwritten in place.

- **ZH-N1** `mobile.notifications.detail.section_notification`: `通知` → `通知内容`. 通知内容 names the body-text section accurately and no longer repeats the 通知 screen title. 8 cells against a ~16 hint. Resolved.

No new findings. The remaining round-1 MINOR/NIT findings in this namespace (if any) stand as recorded: non-gating, upstream or QA items. **Verdict: passed**, 0 unresolved BLOCKER/MAJOR.

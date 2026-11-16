# zh-CN audit — mobile.schedules (O3-a) — o3a-zhCN-sched

Auditor: i18n-auditor (lopdev), session 49772dd20be0, model anthropic/claude-opus-5-5. Translator session bb79330944ae (independent).
Draft route: direct read of the translator scratchpad (sha256 8ecdc5ced43efc97a73636f911d5fa1de14e8a5e12ad2f81c3a17f3e25eeb128 matches the attested hash); the relayed copy is dict-equal. Canonical sha256 cde876eefdc47d382c7e317105ca2f929afcf0c091f5e80bfe6d58a98d4d66ee.
Verdict: **passed**. Unresolved BLOCKER/MAJOR: 0.

| key | en | zh-CN | cells (sample) | mechanical |
|---|---|---|---|---|
| `mobile.schedules.section.wakes` | Wakes | 唤醒 | 4 | OK |
| `mobile.schedules.section.wakes_summary` | Wakes · {summary} | 唤醒 · {summary} | 16 | OK |
| `mobile.schedules.section.monitors` | Monitors | 监控 | 4 | OK |
| `mobile.schedules.section.monitors_summary` | Monitors · {summary} | 监控 · {summary} | 16 | OK |

## Findings
- None.

Consistency checked against the shipped zh-CN catalogue @26663e18 (e.g. sidebar.section.today 今天, relay.chrome.session.subtitle.waiting 等待你处理, relay.chrome.drawer.projects 项目, settings.section.* 连接/外观/关于, the " · " separator in library.browse.filters_count) and the glossary (唤醒, 监控, 项目, 会话).

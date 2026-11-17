# O3-a hi audit — mobile.notifications (o3a-hi-notif)

Verdict: **passed** — 0 BLOCKER, 0 MAJOR, 0 MINOR. Keys: 6. Auditor: i18n-auditor, session 7f1fd014ba0d, model anthropic/claude-opus-5-5 (no fallback). Translator: session ea3ea9b9290e. No MT used.

## Mechanical
The JSON is valid. The key set and order match the brief. ICU args, plural arms (one/other) and the # count equal en. The text is NFC with no ZW*. Digits are Latin. There are 0 redaction-marker hits. The brief en/context hashes match 26663e18. A negative control caught the 4 seeded defects. See audit.log.

## Values
- `mobile.notifications.section.waiting` = आपका इंतज़ार  (en: Waiting on you)
- `mobile.notifications.section.waiting_count` = आपका इंतज़ार · {count}  (en: Waiting on you · {count})
- `mobile.notifications.detail.title` = सूचना  (en: Notification)
- `mobile.notifications.detail.section_notification` = विवरण  (en: Notification)
- `mobile.notifications.detail.section_links` = लिंक  (en: Links)
- `mobile.notifications.detail.section_message` = संदेश  (en: Message)

## Terminology
waiting 'आपका इंतज़ार' and waiting_count keep relay's wording (without its ', number'). detail.title 'सूचना', links 'लिंक' (relay), message 'संदेश' (noun, as required).

## Findings
None.

## Checks / notes
- **obs-detail**: Observation, no finding: detail.section_notification → 'विवरण' ('details/body') instead of repeating 'सूचना' under the 'सूचना' screen title. This is a deliberate, accurate choice. It does not collide on that screen with स्रोत/लिंक/संदेश/पिछले अपडेट. ('विवरण' also translates projects.create.description, but on a different screen.)

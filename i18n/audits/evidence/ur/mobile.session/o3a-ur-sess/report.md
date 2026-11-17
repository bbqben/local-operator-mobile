# O3-a ur audit — mobile.session (o3a-ur-sess)

Auditor: i18n-auditor (lopdev), session 966cb6dc566f, model anthropic/claude-opus-5-5 (from the session system prompt; no fallback observed). Translator session bdbee2a271c1 — independent.

Draft: /Users/damian/.local-operator/sessions/bdbee2a271c1/scratchpad/o3a/draft-ur.json sha256 2ceedc0c2b53366bcbc2238cac66b488deade32abba4aa61a9572ea4eae617a7, read directly (no guardrail block). English/context: git show 26663e18:src/i18n/catalogues/en/mobile.session(.context).json. Keys: 2.

**Verdict: passed** — no translation BLOCKER/MAJOR. Translation findings: none.

## Keys
| key | en | ur |
|---|---|---|
| mobile.session.sheet_title.commands | commands | کمانڈز |
| mobile.session.sheet_title.attach | attach | منسلک کریں |

## Checks answered (whole slice)
- Mechanical: 40/40 keys, none added/dropped; ICU skeletons identical to en (my parser, with negative controls detected); plural selectors one/other only (CLDR ur); 0 bidi/zero-width controls; NFC; Latin digits only, no Urdu digits; 0 `redacted` hits; no Latin left in values; no trailing full stops on headings. The mobile repo validator (scripts/i18n TS) was NOT run: the brief makes the repo read-only, with no builds or tests.
- Register: آپ only where address occurs («آپ کا انتظار»); the imperative «منسلک کریں» is respectful.
- Plurals: hours one «گھنٹہ» / other «گھنٹے»; weeks one «ہفتہ» / other «ہفتے». سیکنڈ/منٹ/دن/سال stay invariant (correct). «1 گھنٹہ قبل» and «1 ہفتہ» are the standard direct case.
- earlier_this_week «پچھلے چند دن»: timeBucket (notifications-model.ts:137-147) covers 2–6 calendar days before today, a rolling window. "The past few days" fits it on every weekday; «اس ہفتے» would be wrong on Mon/Tue. PASS.
- «کل» is used for both yesterday and tomorrow. It renders only as (a) an inbox section heading between «آج» and «پچھلے چند دن», (b) a Team Bridge day divider over past messages (model.ts:530), and (c) the row age / a11y label of a past notification (notifications-model.ts:531). No future-facing site uses these keys, so the reading is unambiguous in practice; it matches relay.notifications.section.yesterday.
- BIDI: all 16 digit-initial values (mobile.time.relative.*_ago* ×7, short.* ×9) resolve their first STRONG character to Arabic letters (AL), so dir=auto (react-native-web), iOS Natural, and Android FIRSTSTRONG_LTR all resolve RTL. The ` · {count}` / ` · {summary}` keys open with Urdu (AL), and the shipped summary digits follow an AL, so W2 makes them AN and they stay in logical order; the visual order right→left is «بیداریاں · 3 شیڈول شدہ · 1 ناکام». schedules.tsx headers already pass labelDir={composedDir} (direction.tsx useComposedDir → web dir + native writingDirection). Other sites (notifications row meta, list-row time, team-bridge rowStamp, elapsed chip, Past row «age · date») render the value alone or Urdu-first, so they resolve RTL without help. LTR-container hazards exist only where O3-a code splices the Urdu value into an English literal: see C1. Native iOS/Android rendering is UNVERIFIED (no device or simulator frame; reasoning from UAX#9 and the RN source cited in direction.tsx).
- mobile.time.short.* reused as row-stamp ages (team-bridge rowStamp, drawer relativeTimeFor): a bare «5 منٹ» reads as a duration, but in a list's trailing time slot it is understood as age, the same as the English «5m». Note only.
- Widths: see F1. Arabic script ≈ 1 cell per code point (ur.md §Width).

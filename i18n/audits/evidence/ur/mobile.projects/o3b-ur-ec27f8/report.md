# i18n audit o3b-ur-ec27f8 — ur / mobile.projects (slice O3-b)

Verdict: **passed** — 23 keys, 0 BLOCKER/MAJOR, findings: UR-P1.

Auditor: i18n-auditor (team lopdev), session ec27f8bf0ab6, model anthropic/claude-opus-5-5 (system prompt 'Model:' line; no fallback observed). Independent of translator session 433f5c8f541e.

Draft: /Users/damian/.local-operator/sessions/433f5c8f541e/scratchpad/o3b/draft-ur.json sha256 dbc9e98f…1ade, copied to my scratchpad (work/draft-ur.json) and re-verified identical before running the checker. Brief sha256 63351e7e…9ddfe, also copied and re-verified. Read route: ordinary file reads; core read_public_copy was not used (it refuses mobile catalogue paths).

## Mechanical

Checker: work/check.ts run with repo tsx, importing src/i18n/messages.ts parseMessage/formatMessage read-only. Params identical to English for every key; plural arms one/other = Intl.PluralRules('ur') categories; NFC; no bidi controls; no ASCII ?/Hindi danda; Latin digits only; negative controls (param rename, broken ICU, bidi control, marker, danda) all caught. Redaction marker: draft 0, eight English/context inputs 0; brief raw 2 hits, both inside its own redaction_scan.pattern field — 0 with that field excluded. Brief English hashes equal the worktree files at 39b5e3e5.

## RTL

No value leads with a Latin run. Values that lead with a placeholder (row.asks/agents/todos via `#`, asks_not_blocker via {asks}) render digit-first; digits are weak, so first-strong (FSI) direction is Arabic-script RTL. Latin user data ({names}, {name}) sits after Urdu text or inside “ ”. Urdu punctuation ۔ ، ؟ used; no arrows or mirrored glyphs.

## Notes

23 keys checked. Glossary: پروجیکٹ, ایجنٹ, سیشن per glossary §; سنگ میل, حذف کریں, ہٹائیں match shipped mobile.projects.delete_body/remove_milestone_body/milestones.none and core tui.projects_edit. empty.next renders 'شروع کرنے کے لیے “نیا پروجیکٹ” دبائیں…' — {action}=shipped mobile.projects.create.title, “…” and دبائیں both shipped (mobile.computers.own_tunnel.verdict_local_network). edit_label prefixes سنگ میل so a Latin {name} never leads. complete_hint follows shipped 'پڑھا ہوا نشان زد کریں' pattern. name_placeholder پہلی ریلیز is an accepted natural example (context: example, not identifier).

## Keys and widths (graphemes / hint)

- `mobile.projects.list.load_failed` — ہم ابھی آپ کے پروجیکٹس نہیں پڑھ سکے۔ — 36 
- `mobile.projects.empty.headline` — ابھی کوئی پروجیکٹ نہیں۔ — 23/~32 
- `mobile.projects.empty.next` — شروع کرنے کے لیے “{action}” دبائیں، یا کسی ایجنٹ سے ایک بنانے کو کہیں۔ — 73 
- `mobile.projects.detail.gone` — یہ پروجیکٹ اب دستیاب نہیں ہے۔ — 29 
- `mobile.projects.detail.title_fallback` — پروجیکٹ — 7/~16 
- `mobile.projects.detail.load_failed` — ہم ابھی یہ پروجیکٹ نہیں پڑھ سکے۔ — 32 
- `mobile.projects.detail.milestones_empty` — کوئی سنگ میل نہیں۔ — 18/~24 
- `mobile.projects.detail.sessions_empty` — کوئی سیشن جڑا ہوا نہیں۔ — 23/~28 
- `mobile.projects.detail.delete` — پروجیکٹ حذف کریں — 16/~24 
- `mobile.projects.detail.delete_confirm` — حذف کریں — 8/~12 
- `mobile.projects.milestone.add` — سنگ میل شامل کریں — 17/~24 
- `mobile.projects.milestone.edit_title` — سنگ میل میں ترمیم کریں — 22/~24 
- `mobile.projects.milestone.add_submit` — شامل کریں — 9/~12 
- `mobile.projects.milestone.remove` — سنگ میل ہٹائیں — 14/~24 
- `mobile.projects.milestone.remove_confirm` — ہٹائیں — 6/~12 
- `mobile.projects.milestone.name` — نام — 3 
- `mobile.projects.milestone.name_placeholder` — پہلی ریلیز — 10/~20 
- `mobile.projects.milestone.target_date` — ہدف کی تاریخ — 12/~20 
- `mobile.projects.milestone.target_date_placeholder` — سال-ماہ-دن — 10 
- `mobile.projects.milestone.target_date_help` — تاریخ ہٹانے کے لیے خانہ خالی کر دیں۔ — 36 
- `mobile.projects.milestone.reopen_hint` — سنگ میل کو دوبارہ کھولتا ہے — 27 
- `mobile.projects.milestone.complete_hint` — سنگ میل کو مکمل نشان زد کرتا ہے — 31 
- `mobile.projects.milestone.edit_label` — سنگ میل “{name}” میں ترمیم کریں — 39 

## Findings

### UR-P1 — NIT — `mobile.projects.milestone.target_date_placeholder`
- Current: سال-ماہ-دن
- Problem: Reading order is correct (year→month→day, 10 chars, matches the brief rule), but in the RTL Input the hint paints سال at the right edge while typed ISO digits (2026-11-17) paint the year at the left, and the hint drops the 4-2-2 digit-count cue of YYYY-MM-DD. Not a defect; Urdu readers read numbers LTR.
- Suggested: Keep سال-ماہ-دن. If QA sees users mistyping, the only safe alternative is the Latin LTR island YYYY-MM-DD (allowed by ur.md: a string that is mostly an LTR token keeps the source order).

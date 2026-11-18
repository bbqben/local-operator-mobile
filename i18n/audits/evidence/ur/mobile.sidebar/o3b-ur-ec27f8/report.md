# i18n audit o3b-ur-ec27f8 — ur / mobile.sidebar (slice O3-b)

Verdict: **passed** — 15 keys, 0 BLOCKER/MAJOR, findings: UR-S1, UR-S2, UR-S3, UR-S4.

Auditor: i18n-auditor (team lopdev), session ec27f8bf0ab6, model anthropic/claude-opus-5-5 (system prompt 'Model:' line; no fallback observed). Independent of translator session 433f5c8f541e.

Draft: /Users/damian/.local-operator/sessions/433f5c8f541e/scratchpad/o3b/draft-ur.json sha256 dbc9e98f…1ade, copied to my scratchpad (work/draft-ur.json) and re-verified identical before running the checker. Brief sha256 63351e7e…9ddfe, also copied and re-verified. Read route: ordinary file reads; core read_public_copy was not used (it refuses mobile catalogue paths).

## Mechanical

Checker: work/check.ts run with repo tsx, importing src/i18n/messages.ts parseMessage/formatMessage read-only. Params identical to English for every key; plural arms one/other = Intl.PluralRules('ur') categories; NFC; no bidi controls; no ASCII ?/Hindi danda; Latin digits only; negative controls (param rename, broken ICU, bidi control, marker, danda) all caught. Redaction marker: draft 0, eight English/context inputs 0; brief raw 2 hits, both inside its own redaction_scan.pattern field — 0 with that field excluded. Brief English hashes equal the worktree files at 39b5e3e5.

## RTL

No value leads with a Latin run. Values that lead with a placeholder (row.asks/agents/todos via `#`, asks_not_blocker via {asks}) render digit-first; digits are weak, so first-strong (FSI) direction is Arabic-script RTL. Latin user data ({names}, {name}) sits after Urdu text or inside “ ”. Urdu punctuation ۔ ، ؟ used; no arrows or mirrored glyphs.

## Notes

15 keys checked. زمرہ for category is already shipped in core ur relay.session.tags.empty ('ابھی کوئی ٹیگ زمرہ نہیں'), so the translator's 'no shipped term' note is mobile-only true; term is consistent. ٹیگز = relay.chrome.row.tags. Count chips match core ur relay.chrome.session.tray.questions (# سوال/# سوالات), tui.status.agents (# ایجنٹ/# ایجنٹس), mobile.session.region.label_todos (کام, invariant). Widths: asks 6-9, agents 7-9, todos 5-6 vs ~10. نئی agrees with گفتگو (mobile.chrome.drawer.open_count). remove_all/remove_all_title identical to core relay.session.tags.

## Keys and widths (graphemes / hint)

- `mobile.sidebar.tags.remove_all` — تمام ٹیگز ہٹائیں — 16/~24 
- `mobile.sidebar.tags.remove_all_title` — تمام ٹیگز ہٹائیں؟ — 17/~28 
- `mobile.sidebar.tags.remove_all_body` — اس سے اس گفتگو سے ہر زمرہ ہٹ جائے گا۔ زمرے بذاتِ خود ڈیسک ٹاپ ایپ میں موجود رہیں گے۔ — 83 
- `mobile.sidebar.tags.remove_all_confirm` — ہٹائیں — 6/~12 
- `mobile.sidebar.tags.saving` — محفوظ ہو رہا ہے… — 16/~12 OVER(16>12)
- `mobile.sidebar.tags.load_failed_title` — آپ کے زمرے لوڈ نہیں ہو سکے — 26/~32 
- `mobile.sidebar.tags.load_failed_body` — ہم ابھی زمروں کی فہرست نہیں پڑھ سکے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔ — 68 
- `mobile.sidebar.tags.empty_headline` — ابھی کوئی زمرہ نہیں۔ — 20/~28 
- `mobile.sidebar.tags.empty_next` — ڈیسک ٹاپ پر بنتے ہیں۔ — 21/~24 
- `mobile.sidebar.tags.announcement` — ٹیگز: {names} — 20 
- `mobile.sidebar.row.new` — نئی — 3/~8 
- `mobile.sidebar.row.asks` — {count, plural, one {# سوال} other {# سوالات}} — 8/6/8/9/~10 
- `mobile.sidebar.row.asks_not_blocker` — {asks}، رکاوٹ نہیں — ایجنٹ کام جاری رکھے ہوئے ہے — 50 
- `mobile.sidebar.row.agents` — {count, plural, one {# ایجنٹ} other {# ایجنٹس}} — 8/7/8/9/~10 
- `mobile.sidebar.row.todos` — {count, plural, one {# کام} other {# کام}} — 5/5/5/6/~10 

## Findings

### UR-S1 — MINOR — `mobile.sidebar.tags.remove_all_body`
- Current: اس سے اس گفتگو سے ہر زمرہ ہٹ جائے گا۔ زمرے بذاتِ خود ڈیسک ٹاپ ایپ میں موجود رہیں گے۔
- Problem: Meaning and safety correct (assignment cleared, categories kept). First sentence stacks two سے with different senses (instrumental 'by this' + ablative 'from this conversation'), which reads clunky; 'every category' reads more naturally as تمام زمرے.
- Suggested: یہ اس گفتگو سے تمام زمرے ہٹا دیتا ہے۔ زمرے خود ڈیسک ٹاپ ایپ میں موجود رہیں گے۔

### UR-S2 — MINOR — `mobile.sidebar.tags.saving`
- Current: محفوظ ہو رہا ہے…
- Problem: 16 graphemes vs ~12 hint (translator flagged). Verified non-clipping: tags-sheet.tsx L580-590 gives the tag name min-w-0 flex-1 numberOfLines=1 and the saving Text its natural width, so the tag name ellipsizes ~4 cells earlier; L398-401 renders it on its own line. Identical to shipped mobile.account_routing.saving and core relay.session.tags.saving.
- Suggested: Keep verbatim (consistency outranks 4 cells). Only if design measures the row as too tight: محفوظ ہو رہا… (13), the drop-ہے pattern ur.md records for relay.health.reconnecting.

### UR-S3 — NIT — `mobile.sidebar.row.asks_not_blocker`
- Current: {asks}، رکاوٹ نہیں — ایجنٹ کام جاری رکھے ہوئے ہے
- Problem: Leading {asks} verified safe: list-row.tsx L320-322 passes asks: t('mobile.sidebar.row.asks',{count}), rendered '2 سوالات' — a digit (weak EN) then Arabic-script, so first-strong is RTL. The '— ایجنٹ کام جاری رکھے ہوئے ہے' clause is an addition to the English, but it states the context's own meaning and bare رکاوٹ نہیں is opaque; screen-reader only, no width cap.
- Suggested: Keep as is.

### UR-S4 — NIT — `mobile.sidebar.tags.empty_next`
- Current: ڈیسک ٹاپ پر بنتے ہیں۔
- Problem: ڈیسک ٹاپ پر can read as 'on the (computer) desktop'; shipped copy says ڈیسک ٹاپ ایپ میں (relay.session.tags.empty_hint, mobile.agent_avatar.edit_hint). The full form ڈیسک ٹاپ ایپ میں بنتے ہیں۔ is 25 graphemes against the ~24 cap; the English 'on desktop' is equally terse.
- Suggested: Keep within width; ڈیسک ٹاپ ایپ میں بنتے ہیں۔ (25) if design accepts +1 grapheme at 200% text.

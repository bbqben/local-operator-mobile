# i18n audit o3b-ur-ec27f8 — ur / mobile.common (slice O3-b)

Verdict: **passed** — 2 keys, 0 BLOCKER/MAJOR, findings: none.

Auditor: i18n-auditor (team lopdev), session ec27f8bf0ab6, model anthropic/claude-opus-5-5 (system prompt 'Model:' line; no fallback observed). Independent of translator session 433f5c8f541e.

Draft: /Users/damian/.local-operator/sessions/433f5c8f541e/scratchpad/o3b/draft-ur.json sha256 dbc9e98f…1ade, copied to my scratchpad (work/draft-ur.json) and re-verified identical before running the checker. Brief sha256 63351e7e…9ddfe, also copied and re-verified. Read route: ordinary file reads; core read_public_copy was not used (it refuses mobile catalogue paths).

## Mechanical

Checker: work/check.ts run with repo tsx, importing src/i18n/messages.ts parseMessage/formatMessage read-only. Params identical to English for every key; plural arms one/other = Intl.PluralRules('ur') categories; NFC; no bidi controls; no ASCII ?/Hindi danda; Latin digits only; negative controls (param rename, broken ICU, bidi control, marker, danda) all caught. Redaction marker: draft 0, eight English/context inputs 0; brief raw 2 hits, both inside its own redaction_scan.pattern field — 0 with that field excluded. Brief English hashes equal the worktree files at 39b5e3e5.

## RTL

No value leads with a Latin run. Values that lead with a placeholder (row.asks/agents/todos via `#`, asks_not_blocker via {asks}) render digit-first; digits are weak, so first-strong (FSI) direction is Arabic-script RTL. Latin user data ({names}, {name}) sits after Urdu text or inside “ ”. Urdu punctuation ۔ ، ؟ used; no arrows or mirrored glyphs.

## Notes

Both keys clean: بند کریں (8/~12) and لوڈ ہو رہا ہے (13/~16, no ellipsis per context; shipped mobile.home.picker.loading keeps the ellipsis where its English has one).

## Keys and widths (graphemes / hint)

- `mobile.common.close` — بند کریں — 8/~12 
- `mobile.common.loading` — لوڈ ہو رہا ہے — 13/~16 

## Findings

None.

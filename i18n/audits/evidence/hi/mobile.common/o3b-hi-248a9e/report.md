# O3-b audit — hi / mobile.common

Auditor: i18n-auditor, session 248a9ead8d63, model anthropic/claude-opus-5-5 (no fallback). Translator session 805773971354 (independent).
Draft sha256 14b806e26a8cd3ddbb802a62c9d93b6e33920804f464c6b1e3eaabe9bc09cda0 · brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe · source 39b5e3e5.

**Verdict: passed** — 2 keys, 0 BLOCKER, 0 MAJOR, 0 MINOR, 0 NIT.

Mechanical: placeholders identical, ICU parses with the repo parser, hi CLDR one/other present, NFC, no ZWJ/ZWNJ, danda for full stops, all width hints met, redaction hits 0.

## Findings

None.


## Verified without finding

- close 'बंद करें' matches shipped close verbs (mobile.chrome.close_conversations, team_bridge.default_on.turn_off); 5 graphemes ≤12.
- loading 'लोड हो रहा है' omits the ellipsis as the context requires (shipped picker.loading keeps '…' because its English does); 9 ≤16.

## Keys

- `mobile.common.close`: बंद करें
- `mobile.common.loading`: लोड हो रहा है

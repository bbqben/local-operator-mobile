# O3-b audit — hi / mobile.sidebar

Auditor: i18n-auditor, session 248a9ead8d63, model anthropic/claude-opus-5-5 (no fallback). Translator session 805773971354 (independent).
Draft sha256 14b806e26a8cd3ddbb802a62c9d93b6e33920804f464c6b1e3eaabe9bc09cda0 · brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe · source 39b5e3e5.

**Verdict: passed** — 15 keys, 0 BLOCKER, 0 MAJOR, 1 MINOR, 1 NIT.

Mechanical: placeholders identical, ICU parses with the repo parser, hi CLDR one/other present, NFC, no ZWJ/ZWNJ, danda for full stops, all width hints met, redaction hits 0.

## Findings

- **HI-S1 MINOR** `mobile.sidebar.row.new`
  - current: नया
  - problem: Marker sits on a conversation row with unread activity; बातचीत and गतिविधि are both feminine, and the shipped drawer string for the same unread concept is '# नई बातचीत' (mobile.chrome.drawer.open_count). Masculine नया is the generic badge form but disagrees with the shipped noun.
  - replacement: नई

- **HI-S2 NIT** `mobile.sidebar.tags.remove_all_body`
  - current: इससे इस बातचीत से सभी श्रेणियाँ हट जाती हैं। श्रेणियाँ ख़ुद डेस्कटॉप ऐप में बनी रहती हैं।
  - problem: 'इससे इस बातचीत से' stacks two से within three words; meaning is correct (assignment cleared, categories kept).
  - replacement: यह इस बातचीत से सभी श्रेणियाँ हटा देता है। श्रेणियाँ ख़ुद डेस्कटॉप ऐप में बनी रहती हैं।


## Verified without finding

- 'Tags' word टैग matches relay.chrome.row.tags (brief rule).
- category → श्रेणी/श्रेणियाँ: no shipped hi term exists; standard and used consistently in all 5 category strings.
- row.asks सवाल matches shipped notifications.detail.conversation_asks; row.todos कार्य matches session.region.label_todos / relay.chrome.session.tray.tasks; row.agents एजेंट per glossary. Nouns are invariant in the direct case, so one==other text is correct; worst arm '99 कार्य' 7 graphemes ≤10.
- asks_not_blocker 'एजेंट रुका नहीं है' says the agent keeps working, as the context requires; no false 'waiting' polarity.
- saving 'सहेजा जा रहा है…' is 11 graphemes ≤12 (the translator's note counted 16 code points; it is within the hint). Matches shipped account_routing.saving. Render site: tag name is flex-1/min-w-0/numberOfLines=1 beside it, so no clipping either way.
- empty_next 'डेस्कटॉप ऐप में बनती हैं।' 16 ≤24; implied plural subject reads naturally after the headline.

## Keys

- `mobile.sidebar.tags.remove_all`: सभी टैग हटाएँ
- `mobile.sidebar.tags.remove_all_title`: सभी टैग हटाएँ?
- `mobile.sidebar.tags.remove_all_body`: इससे इस बातचीत से सभी श्रेणियाँ हट जाती हैं। श्रेणियाँ ख़ुद डेस्कटॉप ऐप में बनी रहती हैं।
- `mobile.sidebar.tags.remove_all_confirm`: हटाएँ
- `mobile.sidebar.tags.saving`: सहेजा जा रहा है…
- `mobile.sidebar.tags.load_failed_title`: आपकी श्रेणियाँ लोड नहीं हुईं
- `mobile.sidebar.tags.load_failed_body`: हम अभी श्रेणियों की सूची नहीं पढ़ सके। थोड़ी देर में फिर से कोशिश करें।
- `mobile.sidebar.tags.empty_headline`: अभी कोई श्रेणी नहीं।
- `mobile.sidebar.tags.empty_next`: डेस्कटॉप ऐप में बनती हैं।
- `mobile.sidebar.tags.announcement`: टैग: {names}
- `mobile.sidebar.row.new`: नया
- `mobile.sidebar.row.asks`: {count, plural, one {# सवाल} other {# सवाल}}
- `mobile.sidebar.row.asks_not_blocker`: {asks}, एजेंट रुका नहीं है
- `mobile.sidebar.row.agents`: {count, plural, one {# एजेंट} other {# एजेंट}}
- `mobile.sidebar.row.todos`: {count, plural, one {# कार्य} other {# कार्य}}

# hi — M3 S4 follow-up audit (auditor session d91dff98db01)

Auditor: i18n-auditor, session d91dff98db01, model anthropic/claude-opus-5-5 (no fallback). Independent of translator session 61f275865611.
Source commit: 51debe8e71a52222953c43f001e942fc660f7057. Candidate: draft-hi.json (v1), sha256 042f62b1…5f85. Also read draft-hi-v2.json (1ea26898…daa) for the lane decision.

## Verdict: PASSED (v1) — BLOCKER 0, MAJOR 0, MINOR 0, NIT 0

| key | en | shipped | v1 | judgement |
|---|---|---|---|---|
| mobile.signin.diagnostics | Sign-in diagnostics | साइन-इन निदान | साइन-इन डायग्नॉस्टिक्स | Correct. Noun sense → डायग्नॉस्टिक्स per S2c r2 glossary row (noun = डायग्नॉस्टिक्स, verb = निदान करना); byte-identical noun to mobile `mobile.settings.section.diagnostics`/`.diagnostics.copy`/`.copied` and desktop `ui.providers.phone.*` (ॉ spelling, 3 hits). Closes hi-GAP-R2-1. Bare noun compound: no verb or gender agreement to break. Hyphenated noun-use साइन-इन matches the catalogue convention (verb uses are unhyphenated "साइन इन करें", 4 of them; noun uses hyphenated, 16). |

Mechanical: one key, keyset after merge == en keyset; placeholders parsed with repo messages.ts (sha c1831406…): en/hi both zero arguments, MATCH; negative controls: added `{name}` DETECTED, unclosed `{name` throws. Bidi/ZW controls 0. `[redacted]` marker hits 0 in brief and both drafts (the brief's hi context note contains the plain word "redacted" once — source text). Length 19→22 chars (1.16×), below 1.6×.

## Lane decision v1 vs v2 — agree with the translator: ship v1
- The rendered toggle (`sign-in-panel.tsx:139-142`, one Button switching show/hide) uses en "Show/Hide sign-in details". The shipped hi pair साइन-इन का विवरण दिखाएँ/छिपाएँ renders "details" faithfully and is already a matched pair; v1 leaves it untouched.
- v2 imports "diagnostics" into a label whose source deliberately does not say it. Every other shipped locale keeps "details" on the toggle (es detalles, fr détails, ru сведения, vi chi tiết, zh 详情, ur تفصیلات) while using a separate "diagnostics" word only for `mobile.signin.diagnostics`. v2 would make hi the outlier, and grows the toggle to 1.45×. Not a defect, but no reason to take it.
- Glossary applies to the *term* Diagnostics; translating "details" as विवरण is not a glossary violation.

## Dead key (verified)
`git grep` at 51debe8e for `signin.diagnostics` or a templated `mobile.signin.${…}` in src/ outside catalogues and catalogue.gen.ts: no match (exit 1). catalogue.gen.ts has 12 entries (type unions, params, en, context, 8 locale values). The visible control uses only show_/hide_diagnostics; the revealed region has no heading key. So `mobile.signin.diagnostics` is a dead key in **every** locale, not a hi issue.
- The change is not harmful and not wasted: it removes the last noun-sense निदान from the hi mobile catalogue, so a future call site inherits the glossary term, and keeps glossary greps clean. But it has **zero user-visible effect** — do not count it as UI-translation progress.
- Report (code-side, out of this translation scope, non-gating): remove the dead key from en + all locales + context in a code PR, or wire it as the diagnostics region heading/a11y label if that was the intent. Not a translation finding; no severity assigned.

## Findings
None against the draft.

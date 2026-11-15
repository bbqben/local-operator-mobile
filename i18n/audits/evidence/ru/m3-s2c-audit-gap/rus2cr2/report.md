# ru audit — m3-s2c "audit gap", ROUND 2 (66 keys @ 9214ff9b + draft)

Auditor: i18n-auditor, session 3a8c49e648fe, model anthropic/claude-opus-5-5 (no fallback). Independent of round-1 auditor (df512b3fe891) and translator (c12ae2da7082).
Inputs verified: brief 30da9470…edbda5, draft 42030448…993dda3, round-1 record c0f006c8…94c5. Redaction-marker hits 0. Route: git/scratch reads; read_public_copy not used.

**Verdict: passed** — BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0.

## 1. Round-1 resolution
| ID | Sev | Status | Note |
|---|---|---|---|
| ru-GAP-1 | MAJOR (9 keys) | resolved | All nine titles now «{computer}: …»; {computer} no longer governed by к/на. Rendered nominative-correct for «Домашний ноутбук», «Ваш компьютер», 192.168.1.24, MacBook Pro, a URL. refused.title calque fixed («пока не разрешает»). |
| ru-GAP-2 | MINOR | resolved | «Не скопировано — повторите», 26 chars vs resting 22 / copied 23 (was 43). Terse but idiomatic for a ~2 s button feedback label; says what failed and what to do. |
| ru-GAP-3 | NIT | resolved | relay_wait.body = radient_unreachable.body = «Попробуйте ещё раз чуть позже.» (same en). |
| ru-GAP-4 | NIT | resolved | «{computer} спит или не в сети.» — present tense, no gender agreement needed; matches sibling verb titles (relay_wait, wait_network, wait_reconnect). |
| ru-GAP-5 | NIT | resolved | «Если прервать вход, придётся…» — removes завершено/завершите repeat; impersonal infinitive conditional is native; meaning = "stop before sign-in finishes". |

## 2. Scope
Draft has exactly 13 keys = the 13 round-1 flagged keys (9 + 1 + 3). Nothing else changed; no unjustified extras.

## 3. Placeholders (repo messages.ts @9214ff9b, node v24.22.1, env -i, 256 MB)
66/66 identical param sets, 0 mismatches. Negative controls: injected `{computr}` mismatch detected; malformed `{computer: сломано` rejected (RangeError). No plural/select → CLDR n/a.

## EXTRA — {computer} nominative, all 13 keys
13 keys carry {computer} in en and ru (9 draft «{computer}: …» + offline.title draft + 3 shipped subject titles relay_wait/wait_network/wait_reconnect). Every one renders with {computer} as a sentence-initial nominative: e.g. «Домашний ноутбук: Local Operator не запущен.», «Ваш компьютер: доступ с телефона выключен.», «192.168.1.24 спит или не в сети.», «Домашний ноутбук сейчас не может связаться с Radient.». No preposition governs the slot anywhere; present-tense/impersonal predicates mean no gender agreement with the name. Full 13×4 render in audit.log.

## 4. Final-set consistency
- Identical English → identical ru: no divergent group (both "Try again in a moment." now match).
- Terms: «доступ с телефона», «консоль Radient», «Local Operator», «оповещения», «компьютер» unchanged; prose «аккаунт» vs desktop menu label «Учётная запись Radient» split kept as round 1 verified.
- Menu paths / quoted controls untouched by the draft (round-1 desktop match retained, byte-identical values).
- Typography: no bidi controls, no straight quotes, no "...", em dashes spaced, no en-identical values. RTL n/a.

## 5. New defects
None found.

## Observations (source/code, not ru values; not counted)
- When no route exists, subject = "Radient" (connection-provider.tsx ~2583): refused.title renders «Radient: Radient пока не разрешает доступ с телефона.» — the en source is equally redundant ("Radient didn't allow phone access to Radient right now."). Source-side, all locales.
- Round-1 ru-GAP-X1 (hard-coded "Your computer" fallback) still applies to code; the ru titles are now safe whichever fallback ships.

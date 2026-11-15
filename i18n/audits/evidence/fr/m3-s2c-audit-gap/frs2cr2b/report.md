# fr audit — m3-s2c "audit gap", ROUND 2b (delta check fr-R2-1)

- Auditor: i18n-auditor · session b27f79fca9d4 · model anthropic/claude-opus-5-5 (from the session's 'Model:' line; no fallback). Independent of the translator (70879ee98b8d) and the round-1 auditor (796f6be72d5f). No MT used.
- Inputs (sha256 verified, copied to in/): draft v2 26d45acf…71d317 · draft v1 7c73ad99…320d6b · brief 30da9470…edbda5 · source 9214ff9b · desktop local-operator-ui origin/main e6122214.
- **Verdict: PASSED** for the final fr set: BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0. Supersedes the round-2 FAILED verdict (record.json 417cb1cbff6b…).

## Delta check (commands and output in audit-r2b.log)
| Check | Result |
|---|---|
| Only `mobile.home.suggestion.phone_access` differs between v1 and v2 | PASS — same 14 keys, 1 diff: 'Accès depuis un téléphone' → 'Activez l’accès téléphone' |
| Byte-identical to desktop `ui.chat.composer.suggestion.phone_access` | PASS — UTF-8 hex identical (U+2019 apostrophe) |
| Fits `SUGGESTION_CHAR_BUDGET.fr` = 31 | PASS — 25 UTF-16 units; longest fr chip in the pool is 25 |
| Placeholders (messages.ts parseMessage, 67 values) | PASS — 0 parse errors, 0 mismatches; both negative controls caught |
| Bidi controls / straight apostrophes | 0 / 0 |

## fr-R2-1: resolved
« Activez l’accès téléphone » restores the action, so tapping the chip stages a prompt that asks for something again. It matches the imperative form of the sibling chips and reads the same as the desktop chip on the same surface. The full feature name « Accès depuis un téléphone » is still used on every heading, menu path and button, as on desktop. No new defect.

Round-1 findings fr-GAP-1…13 were all resolved in round 2. v2 changes none of those keys, so they carry over byte-for-byte.

## Observations (not findings, unchanged)
- The « suspendu » badge versus the « mis en pause » refusal headline mirrors the English split. The English context notes disagree on billing, which is a question for the source copy.
- Outside the batch, the shipped fr catalogues mix U+0020 and U+202F before punctuation, and contain straight '. This is pre-existing and does not gate.

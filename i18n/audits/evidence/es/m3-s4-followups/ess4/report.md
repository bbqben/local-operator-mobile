# es — M3 S4 follow-ups audit (computer → «máquina»)

Auditor: i18n-auditor, session fa3846f03ef6, model anthropic/claude-opus-5-5 (no fallback). Independent of translator session 181884090f7a.
Inputs: brief-s4.json 88022f53…fb87, draft-es.json 38ca7de1…9a6d (both verified). Source commit 51debe8e.

**Verdict: passed. BLOCKER 0 · MAJOR 0 · MINOR 0 · NIT 0.**

## What was checked
- **Scope:** 10/10 brief keys, none added or dropped. Every `current` value equals the shipped value at 51debe8e, and every `en` equals shipped en.
- **Diff:** only the computer noun changed, plus the agreement that the change forces: un→una (chrome.home.connect), El→La (connect_refused.generic), el→la and cerrado→cerrada (gate.signed_out_help), cerrado→cerrada (gate.connecting). The plural «computadoras→máquinas» stays feminine, so «activadas / lo estén» still agree.
- **Term consistency:** the shipped es mobile catalogue had 7 «ordenador», 3 «computadora» and 113 «máquina». After this draft it has 0, 0 and 123. These are exactly the 10 residual keys the S2c r2 report listed (line 38). There is no masculine residue next to «máquina». «equipo» appears only in its sense of a human team.
- **Phrasing matches nearby copy:** «Conectar una máquina» matches «Conecta una máquina para …» (×3). «en reposo» matches own_tunnel.verdict_local_network* and refusal.offline.title.
- **Accuracy:** meaning is preserved in all 10 keys, with no polarity change. channel.description still does not suggest the phone picks the sound. permission.* do not promise delivery.
- **Placeholders:** none in en or es. Checked with messages.ts parseMessage `params` (10/10 equal). Negative controls were detected (malformed brace → RangeError; a parse-valid extra `{host}` gives a params mismatch and the format call throws).
- **Bidi/overflow:** 0 bidi controls. Every value is the same length as or shorter than its shipped predecessor. The home button is 1.11× en, and the highest ratio is 1.36× (composer status line, a 2-line budget). Nothing exceeds 1.6×.

## Observation (not a finding)
«Tu máquina puede seguir cerrada» / «con la máquina cerrada» keep the shipped laptop-lid sense of "closed". It reads slightly less concretely with «máquina» than it did with «ordenador», but it is still clear. The en text is the same, and rewording it falls outside this agreement-only slice.

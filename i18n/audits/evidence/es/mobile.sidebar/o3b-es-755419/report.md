# O3-b es audit — mobile.sidebar

Audit id: o3b-es-755419 · auditor session 7554193aebc4 · model anthropic/claude-opus-5-5 (no fallback) · translator session a24fe2fed9e4 (independent)
Source 39b5e3e5343dc7302b99f731e5806cf82525d346 · draft sha256 0f98a9560be01f834f3fd91e6efaa60787358ca86f679527ed3e92af4d705fa7 · brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe

**Verdict: passed** — 15 keys, 0 BLOCKER/MAJOR.

Mechanical: keys equal; placeholders/ICU parse with repo runtime parser, names/kinds equal to English; es plural arms one/many/other (CLDR); NFC and typography clean; redaction marker hits 0.

## Findings

### ES-S1 — MINOR — `mobile.sidebar.tags.empty_next`
- Current: Créalas en el escritorio.
- Problem: Bare "en el escritorio" first reads as the OS desktop (or a physical desk), not the desktop app; shipped es always spells the app out ("la aplicación de escritorio", mobile.agent_avatar.edit_hint). It is also 25 > ~24, in the line the 200% frame already cut. Shipped es names the computer "máquina" (mobile.computers.add), which states the phone-vs-computer contrast and fits.
- Replacement: Créalas en tu máquina.

### ES-S2 — MINOR — `mobile.sidebar.row.asks`
- Current: {count, plural, one {# pregunta} many {# de preguntas} other {# preguntas}}
- Problem: Width: "2 preguntas" 11 and "10 preguntas" 12 cells vs ~10 hint in a never-truncated monospace strip. "pregunta" is the shipped es term for ask (relay.transcript.label.ask, mobile.notifications.detail.conversation_asks); no shorter correct noun exists ("consultas" is the same length). Not a wording defect.
- Replacement: No wording change; keep. Design to confirm the meta strip tolerates 12 cells at default text size.

### ES-S3 — NIT — `mobile.sidebar.tags.load_failed_title`
- Current: Tus categorías no se cargaron
- Problem: Grammatical, but the verb-first order is the more natural Spanish error title, and it is the same length (29 ≤ 32); the translator note only compared against the 36-char "No se pudieron cargar…".
- Replacement: No se cargaron tus categorías

### ES-S4 — NIT — `mobile.sidebar.tags.load_failed_body`
- Current: No pudimos leer la lista de categorías ahora mismo. Inténtalo de nuevo en un momento.
- Problem: Same sibling-pattern note as ES-P2 (shipped "Ahora mismo no hemos podido leer …"). Non-gating.
- Replacement: Ahora mismo no hemos podido leer la lista de categorías. Inténtalo de nuevo en un momento.

## Keys reviewed without finding

- `mobile.sidebar.tags.remove_all` = Quitar las etiquetas
- `mobile.sidebar.tags.remove_all_title` = ¿Quitar todas las etiquetas?
- `mobile.sidebar.tags.remove_all_body` = Esto quita todas las categorías de esta conversación. Las categorías siguen existiendo en la aplicación de escritorio.
- `mobile.sidebar.tags.remove_all_confirm` = Quitar
- `mobile.sidebar.tags.saving` = Guardando…
- `mobile.sidebar.tags.empty_headline` = Aún no hay categorías.
- `mobile.sidebar.tags.announcement` = Etiquetas: {names}
- `mobile.sidebar.row.new` = nueva
- `mobile.sidebar.row.asks_not_blocker` = {asks}, sin bloqueo
- `mobile.sidebar.row.agents` = {count, plural, one {# agente} many {# de agentes} other {# agentes}}
- `mobile.sidebar.row.todos` = {count, plural, one {# tarea} many {# de tareas} other {# tareas}}

Notes: `nueva` agrees with conversación (shipped drawer.open_count); `sin bloqueo` is number-neutral and correct; `Quitar las etiquetas` (20) vs title `¿Quitar todas las etiquetas?` (28) acceptable; `Etiquetas: {names}` matches relay.chrome.row.tags; agentes/tareas match shipped "Tareas y agentes" / label_todos "tareas".

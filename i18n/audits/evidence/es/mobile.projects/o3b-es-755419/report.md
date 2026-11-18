# O3-b es audit — mobile.projects

Audit id: o3b-es-755419 · auditor session 7554193aebc4 · model anthropic/claude-opus-5-5 (no fallback) · translator session a24fe2fed9e4 (independent)
Source 39b5e3e5343dc7302b99f731e5806cf82525d346 · draft sha256 0f98a9560be01f834f3fd91e6efaa60787358ca86f679527ed3e92af4d705fa7 · brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe

**Verdict: passed** — 23 keys, 0 BLOCKER/MAJOR.

Mechanical: keys equal; placeholders/ICU parse with repo runtime parser, names/kinds equal to English; es plural arms one/many/other (CLDR); NFC and typography clean; redaction marker hits 0.

## Findings

### ES-P1 — MINOR — `mobile.projects.detail.gone`
- Current: Ese proyecto ya no existe.
- Problem: Context: shown on a 404 when the project was deleted OR renamed elsewhere. English hedges ("no longer there"); "ya no existe" asserts deletion, which is false after a rename and may make the operator think the row is gone for good. Shipped es renders the same hedge as "ya no está disponible" (mobile.team_bridge.thread.anchor_missing, mobile.session.subagent.unavailable_headline).
- Replacement: Ese proyecto ya no está disponible.

### ES-P2 — NIT — `mobile.projects.list.load_failed, mobile.projects.detail.load_failed`
- Current: No pudimos leer tus proyectos ahora mismo. / No pudimos leer ese proyecto ahora mismo.
- Problem: Correct and natural, but the three shipped siblings of the identical English pattern "We couldn't read X just now." use "Ahora mismo no hemos podido leer …" (mobile.home.folders_read_failed, mobile.home.models_read_failed, mobile.schedules.read_unreachable). Shipped es is itself mixed ("No pudimos iniciar sesión"), so non-gating.
- Replacement: Ahora mismo no hemos podido leer tus proyectos. / Ahora mismo no hemos podido leer ese proyecto.

## Keys reviewed without finding

- `mobile.projects.empty.headline` = Aún no hay proyectos.
- `mobile.projects.empty.next` = Crea uno con “{action}” o pide a un agente que abra uno.
- `mobile.projects.detail.title_fallback` = Proyecto
- `mobile.projects.detail.milestones_empty` = No hay hitos.
- `mobile.projects.detail.sessions_empty` = No hay sesiones vinculadas.
- `mobile.projects.detail.delete` = Eliminar proyecto
- `mobile.projects.detail.delete_confirm` = Eliminar
- `mobile.projects.milestone.add` = Añadir hito
- `mobile.projects.milestone.edit_title` = Editar hito
- `mobile.projects.milestone.add_submit` = Añadir
- `mobile.projects.milestone.remove` = Quitar hito
- `mobile.projects.milestone.remove_confirm` = Quitar
- `mobile.projects.milestone.name` = Nombre
- `mobile.projects.milestone.name_placeholder` = cierre de versión
- `mobile.projects.milestone.target_date` = Fecha objetivo
- `mobile.projects.milestone.target_date_placeholder` = AAAA-MM-DD
- `mobile.projects.milestone.target_date_help` = Vacía el campo para quitar la fecha.
- `mobile.projects.milestone.reopen_hint` = Reabre el hito
- `mobile.projects.milestone.complete_hint` = Marca el hito como completado
- `mobile.projects.milestone.edit_label` = Editar {name}

Notes: Quitar/Eliminar split matches shipped remove_milestone_body / delete_body; `AAAA-MM-DD` keeps ISO order; `cierre de versión` (17/20) is a natural phase example; `Fecha objetivo` standard PM usage; `{action}` renders “Nuevo proyecto”.

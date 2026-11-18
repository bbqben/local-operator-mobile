# O3-b fr audit — mobile.projects (o3b-fr-c5d861)

Verdict: **passed** — 0 BLOCKER/MAJOR. Keys: 23. Auditor: i18n-auditor, session c5d861950a8b, anthropic/claude-opus-5-5 (independent of translator 5009dab1a05f).
Inputs: draft sha256 2c3c8fbe1f1c92be3c131ceda4ff72e2c984a0984a5a3894965f64f6260c12ff, brief 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe, source 39b5e3e5. Redaction marker hits: draft 0, English 0.

## Findings

### FR-P1 — MINOR — `mobile.projects.detail.gone`
- Current: `Ce projet n’existe plus.`
- Problem: Context: shown on a 404 when the project was deleted OR renamed elsewhere. « n’existe plus » is false for the rename case (it exists under another name); the English « is no longer there » is neutral. The fr corpus renders « no longer there/available » as « n’est plus disponible » (mobile.team_bridge.thread.anchor_missing, mobile.session.subagent.unavailable_headline).
- Proposed: `Ce projet n’est plus disponible.`


## Keys reviewed

| key | en | fr |
|---|---|---|
| `mobile.projects.list.load_failed` | We couldn't read your projects just now. | Impossible de lire vos projets pour le moment. |
| `mobile.projects.empty.headline` | No projects yet. | Aucun projet pour l’instant. |
| `mobile.projects.empty.next` | Start one with {action}, or ask an agent to open one. | Créez-en un avec « {action} », ou demandez à un agent d’en ouvrir un. |
| `mobile.projects.detail.gone` | That project is no longer there. | Ce projet n’existe plus. |
| `mobile.projects.detail.title_fallback` | Project | Projet |
| `mobile.projects.detail.load_failed` | We couldn't read that project just now. | Impossible de lire ce projet pour le moment. |
| `mobile.projects.detail.milestones_empty` | No milestones. | Aucun jalon. |
| `mobile.projects.detail.sessions_empty` | No sessions linked. | Aucune session liée. |
| `mobile.projects.detail.delete` | Delete project | Supprimer le projet |
| `mobile.projects.detail.delete_confirm` | Delete | Supprimer |
| `mobile.projects.milestone.add` | Add milestone | Ajouter un jalon |
| `mobile.projects.milestone.edit_title` | Edit milestone | Modifier le jalon |
| `mobile.projects.milestone.add_submit` | Add | Ajouter |
| `mobile.projects.milestone.remove` | Remove milestone | Retirer le jalon |
| `mobile.projects.milestone.remove_confirm` | Remove | Retirer |
| `mobile.projects.milestone.name` | Name | Nom |
| `mobile.projects.milestone.name_placeholder` | release cut | gel de version |
| `mobile.projects.milestone.target_date` | Target date | Échéance |
| `mobile.projects.milestone.target_date_placeholder` | YYYY-MM-DD | AAAA-MM-JJ |
| `mobile.projects.milestone.target_date_help` | Empty the box to clear the date. | Videz le champ pour effacer la date. |
| `mobile.projects.milestone.reopen_hint` | Reopens the milestone | Rouvre le jalon |
| `mobile.projects.milestone.complete_hint` | Marks the milestone complete | Marque le jalon comme terminé |
| `mobile.projects.milestone.edit_label` | Edit {name} | Modifier {name} |

# O3-b fr audit — mobile.sidebar (o3b-fr-c5d861)

Verdict: **passed** — 0 BLOCKER/MAJOR. Keys: 15. Auditor: i18n-auditor, session c5d861950a8b, anthropic/claude-opus-5-5 (independent of translator 5009dab1a05f).
Inputs: draft sha256 2c3c8fbe1f1c92be3c131ceda4ff72e2c984a0984a5a3894965f64f6260c12ff, brief 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe, source 39b5e3e5. Redaction marker hits: draft 0, English 0.

## Findings

### FR-S1 — MINOR — `mobile.sidebar.tags.saving`
- Current: `Sauvegarde…`
- Problem: Terminology drift: every shipped fr « Saving… » is « Enregistrement… » (mobile.account_routing.saving, mobile.computers.own_tunnel.saving) and save = « Enregistrer » (mobile.common.save); « Sauvegarde » also reads as « backup » in fr UI. The 12-char hint the translator traded for is soft here: tags-sheet.tsx L585-591 puts it beside a flex-1 numberOfLines=1 tag name that ellipsizes, and L398-402 under the full-width Remove-all button, so 15 chars does not clip.
- Proposed: `Enregistrement…`

### FR-S2 — MINOR — `mobile.sidebar.row.new`
- Current: `nouveau`
- Problem: The badge qualifies the conversation row; the fr sidebar agrees in the feminine throughout (Épinglées, Actives d’abord, Plus récentes; relay.chrome Terminée/Inactive) and mobile.chrome.drawer.open_count says « nouvelle conversation ». 8 chars, within the ~8 hint (list-row.tsx L295-298, shrink-0).
- Proposed: `nouvelle`

### FR-S3 — MINOR — `mobile.sidebar.row.asks`
- Current: `{count, plural, one {# question} many {# de questions} other {# questions}}`
- Problem: Over the ~10 hint for every count ≥2: « 2 questions » 11, « 12 questions » 12 (translator flagged). Verified the render: list-row.tsx L316-325 shrink-0, never truncated; the agents/todos chips yield at large text (L238) and marks wrap there (L248). « question » is the established fr word for ask (relay.transcript.label.ask, mobile.notifications.detail.no_asks); « demande » saves only 1 char and breaks it.
- Proposed: `Keep as is; a design call if the strip is measured too tight at 100 % text.`

### FR-S4 — NIT — `mobile.sidebar.tags.empty_next`
- Current: `À créer sur ordinateur.`
- Problem: In this app « ordinateur » names the connected host machine (mobile.computers.*), while the English means the desktop app, and the sibling remove_all_body says « l’application de bureau ». The current text is true but loose.
- Proposed: `Depuis l’app de bureau.`

### FR-S5 — NIT — `mobile.sidebar.tags.remove_all, remove_all_title, announcement`
- Current: `tags / Tags`
- Problem: The draft correctly follows the brief rule (match relay.chrome.row.tags = « Tags », also the sheet title). Existing split, not introduced by this draft: library/projects say « étiquettes » for tags on their own surfaces. Noted for a future corpus decision only.
- Proposed: `No change in this slice.`


## Keys reviewed

| key | en | fr |
|---|---|---|
| `mobile.sidebar.tags.remove_all` | Remove all tags | Retirer tous les tags |
| `mobile.sidebar.tags.remove_all_title` | Remove all tags? | Retirer tous les tags ? |
| `mobile.sidebar.tags.remove_all_body` | This clears every category from this conversation. The categories themselves stay in the desktop app. | Toutes les catégories seront retirées de cette conversation. Les catégories elles-mêmes restent dans l’application de bureau. |
| `mobile.sidebar.tags.remove_all_confirm` | Remove | Retirer |
| `mobile.sidebar.tags.saving` | Saving… | Sauvegarde… |
| `mobile.sidebar.tags.load_failed_title` | Your categories didn't load | Catégories non chargées |
| `mobile.sidebar.tags.load_failed_body` | We couldn't read the list of categories just now. Try again in a moment. | Impossible de lire la liste des catégories pour le moment. Réessayez dans un instant. |
| `mobile.sidebar.tags.empty_headline` | No categories yet. | Pas encore de catégorie. |
| `mobile.sidebar.tags.empty_next` | Created on desktop. | À créer sur ordinateur. |
| `mobile.sidebar.tags.announcement` | Tags: {names} | Tags : {names} |
| `mobile.sidebar.row.new` | new | nouveau |
| `mobile.sidebar.row.asks` | {count, plural, one {# ask} other {# asks}} | {count, plural, one {# question} many {# de questions} other {# questions}} |
| `mobile.sidebar.row.asks_not_blocker` | {asks}, not a blocker | {asks}, sans blocage |
| `mobile.sidebar.row.agents` | {count, plural, one {# agent} other {# agents}} | {count, plural, one {# agent} many {# d’agents} other {# agents}} |
| `mobile.sidebar.row.todos` | {count, plural, one {# todo} other {# todos}} | {count, plural, one {# tâche} many {# de tâches} other {# tâches}} |

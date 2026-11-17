# ADR 0009 — Notification routing by origin: the phone hears about what you started there

- **Status:** Proposed — 2026-11-17
- **Deciders:** the operator (the policy and the defaults); the maintaining team (where origin is
  recorded, and the wire)
- **Amends:** [ADR 0008](0008-desk-presence.md) §3.3 and §3.5, and its §4 slice plan. ADR 0008's
  signal (§3.1), predicate (§3.2) and hold/drop/release rules 1–5 are unchanged. What changes is
  **which items those rules apply to**. Completions are now routed by origin first. The desk
  predicate applies only to items that need you, and to errors.
- **Related:** core #4145 (ADR 0008 slice 1, open at `9134015c`); core #4120 (silence routine
  internal completions, open at `e4a402ec`); core #4101 (deferral).

**Provenance.** Each citation is `repo@rev:path:line`, read with `git show <rev>:<path>`. Revisions:
core `local-operator@9134015c` (the #4145 head). The cited files other than `mobile/daemon.py`
and `mobile/push_worker.py` are byte-identical at `origin/main` `da8f3f04`; `push_worker.py`
carries #4145's own +136/−36 there. The `9134015c` pin is the one that matters.
Cloud `agent-server@48970fd9`; this repository `@f390fdda`.

## The request

> "Maybe something to refine notifications, we can allow the user to select in more detail what
> agent completions will notify them. Many apps that support remoting will only notify when a
> conversation that was started on the mobile app is finished instead of notifying for all
> conversations. The mobile app can notify via push notification for desktop/other started sessions
> (remote included) when there is an ask/approval required for the user. Otherwise I think most
> desktop-side completions shouldn't notify, unless started on the mobile app or there's an ask or
> something that requires the user's attention (in addition to considering the presence/activity
> factors where it makes sense). I think if started on mobile it should notify on mobile, if
> started on other channels/desktop/remote it should notify on the desktop unless we can tell the
> user is not there and there's an ask or some that requires the user's attention, then notify on
> mobile" — operator, 2026-11-17

## 1. Origin: what the code records today

**No record says which surface a conversation or turn came from.** There are three nearby records.
None of them answers the question.

| Record | What it says | Why it is not "started on mobile" |
|---|---|---|
| `origin.json` (`local_operator/divergence.py:476-490`, written by `resume.mark_session_origin`, `resume.py:594`) | **Which code path created the directory**: `subagent`, `agent-shell`, `fork`, `agent-workstream` or `agent-config` (`resume.py:88-157`). **Absence** means the user's own session. | A phone-started and a desktop-started conversation both have no `origin.json`. The phone's start is documented as "indistinguishable from a terminal session" (`mobile/daemon.py:10637-10640`). |
| `mesh.json` `origin` (`session/placement.py:61-63,128`, written at `network/relay.py:10236-10246`) | For a session created on **another mesh device**: `kind` (`user`/`moved`/`fork`), `source_device`, and the `started_by` attestation (`notifications/remote_attention.py:165-202`). | It records device, not surface. The phone never creates one: `POST /api/sessions/start` accepts only `cwd`, `provider` and `model_id`, plus optional `effort` and `temporary` (`mobile/start_receipts.py:55-60`), so it cannot place a session on a peer. |
| `mobile-start-receipts.sqlite3` (`start_receipts.py:26,183-185`) | Keyed phone starts, mapped to `session_id`. | It is an idempotency fence for **keyed** starts only, and the module says it is not a work queue (`:1-8`). Reusing it for routing would overload it. It also says nothing about who sent later turns. |

**The fact exists at one point: the runtime's control connection.** Each prompt and steer arrives
over a connection whose kind, surface and locality the runtime decides at auth time. Nothing in the
frame can forge them:

- The phone's daemon dials with `{"key", "locality": "remote"}` and no `client`
  (`mobile/daemon.py:3205`). Absent `client` means `kind = "daemon"` (`session/runtime/server.py:5292-5293`).
- The desktop's `AttachClient` sends `client: "attach"` and `surface: "desktop"`
  (`mobile/attach_client.py:1397,1408-1409`). That gives `surface = "desktop"`; any other attach
  gets `"terminal"` (`server.py:5416-5418`).
- A mesh peer dials `attach` with `locality: "remote"` (`network/dial.py:372-376`). Locality is
  `local` only for an absent or exact `"local"` value (`server.py:5311-5313`).
- All three are on `_ConnectionAuthority` (`server.py:2136,2153-2154`), built per frame at
  `server.py:8940-8947`. That authority reaches the `prompt` op (`:8998`) and the `steer` op
  (`:9080`), which already use it to stamp `owner_typed=False` on remote input (`:9069,:9111`).
- **It is then dropped.** `h.prompt` receives no surface, so the transcript row and the completion
  carry none.

**The phone reaches a runtime over three connection shapes, not one.** Only the first is the
daemon-kind connection above:

| Phone action | Path | What the runtime sees today |
|---|---|---|
| Prompt, steer or answer into a **live** session | `daemon.request` over the entry's control socket (`mobile/daemon.py:5873-5935`, auth at `:3205`) | `kind = "daemon"`, `locality = "remote"` |
| Prompt that **wakes a cold** conversation | `continue_command` (`mobile/daemon.py:9722-9736`) → `engage_session_client` → `engage_runtime` → `launch._deliver`, which dials a plain `AttachClient` (`session/runtime/launch.py:1243-1246`; default `locality = "local"`, `mobile/attach_client.py:1089`) | `kind = "attach"`, `locality = "local"`, `surface = "terminal"` — indistinguishable from a terminal |
| Answer to a **queued ask on a cold** conversation | `engage_session_client(..., locality="remote")` (`mobile/daemon.py:9857-9858`), then the answer op over that attach | `kind = "attach"`, `locality = "remote"` — indistinguishable from a mesh peer |

Daemon-kind is not unique to the phone either. An absent or unknown `client` maps to `daemon`
(`server.py:5292-5293`), so `lop send` (`mobile/peer_client.py:235`), `lop stop`
(`session/runtime/control.py:354`) and the viewer client (`session/runtime/viewer_client.py:146`)
are daemon-kind too, and `asks/surfaces.py:124-127` already names "a CLI carrier" as one. None of
them sends `prompt`, `steer` or an answer op today, so this is latent. **No connection fact
available today identifies the phone on all three paths.** The fix is a tag the mobile daemon
declares itself (vocabulary below).
- The precedent for keeping it is `asks/surfaces.stamp_answer_surface` (`asks/surfaces.py:107-133`),
  which stamps an ask answer from the connection rather than the frame. Its labels are tuned for
  consent, though: the phone and a mesh peer both read `remote`. Routing needs the raw kind.

**Remote sessions.** A completion on a mesh node does not reach the phone at all today
(`remote_attention.py:99-104`: "a remote completion does not reach the phone yet"). The phone
**can** already command a mesh-owned session: the command route sends it to
`admit_remote_command` before any local admission (`mobile/daemon.py:9566-9585` →
`mobile/remote_sessions.py:574-600`), which opens a relayed viewer to the owner. That prompt
arrives at the owner as a relayed `attach` and stamps `remote` there. This has no routing effect
today, because remote completions do not push.

### Decision 1 — origin is the run's driver: the surface of the most recent human input

| Option | Steering from the phone later | Phone-created, then continued at the desk | Cost |
|---|---|---|---|
| **A. Conversation creator** | Does not count | Still "mobile" for ever | Needs a new create-time record, because no current record carries it (table above) |
| **B. Most recent human input (recommended)** | Counts from that run on | "desktop" from the first desk-typed turn | One stamp at the existing authority point |
| C. Per message, any input | — | — | Wakes, job results and peers have no surface, so origin flickers to unknown |

**Recommendation: B.**

- **Definition.** A run's origin is the surface of the **most recent human input admitted into that
  run**: a prompt, a steer, an ask answer or an approval answer. A run with no human input (a wake,
  a job result, a peer message) inherits the conversation's last driver. A conversation that never
  had a stamped input is `unknown`, and `unknown` routes as non-mobile.
- **Why B.** This is what remoting apps actually key on: the task you dispatched from the phone. A
  phone-created conversation is covered without a create-time record, because its first prompt
  comes from the phone. When you move to the desk and type, the desk owns the conversation's
  notifications again.

**Answers to the brief:**

- **Steering from the phone later counts.** It makes that run mobile-origin.
- **A remote session driven from the phone** already exists (§1, "Remote sessions"); its prompt
  stamps `remote` on the owner, and that is harmless while remote completions do not push. When
  they gain a push source, origin will be judged **on the head device**, the one that relayed the
  prompt: `admit_remote_command` must then record "relayed for the phone" on the head, keyed by
  the command id. The owner's stamp and the node's `mesh.json` will not be used for this, and the
  relay keeps refusing to carry a `mobile` claim (vocabulary invariant below).
- **Origin is per run.** It is sticky per conversation only for runs without human input.

**Vocabulary**, derived from the connection's auth-time facts only, first match wins:

| Connection | Origin |
|---|---|
| `surface == "mobile"` (new; declared by the mobile daemon on every connection it opens for the phone) | `mobile` (the native app or the phone web portal, both through the mobile daemon) |
| `kind == "daemon"`, `locality == "remote"` (a daemon that predates the tag; only the mobile daemon dials so, `mobile/daemon.py:3205`) | `mobile` |
| `kind == "attach"`, `locality == "remote"` | `remote` |
| `attach`, `surface == "desktop"` | `desktop` |
| other `attach` (`locality == "local"`) | `tui` |
| a direct in-process `Session.prompt`/`steer` with no `input_surface` (the owner's own TUI) | `tui` |
| `kind == "daemon"`, `locality == "local"` (`lop send`, `lop stop`, the viewer client, any CLI carrier) | `unknown` |

**How the tag is declared, and why it cannot be forged from another device.**

- **Discriminator: the mobile daemon's own client tag, not the phone's device identity.** The
  device certificate (`operator_cert`, stage D, `mobile/daemon.py:3209-3212`) exists only on a
  paired phone; a portal session authenticated by password has none. Every phone action does pass
  through the mobile daemon, so the daemon is the one party that always knows.
- **Where it is declared.** The daemon adds `surface: "mobile"` to the auth frame of every
  connection it opens on the phone's behalf: its control socket (`mobile/daemon.py:3205`), its
  viewer and throwaway `AttachClient`s (`:6098`, `:11020`) and the cold-answer dial (`:9857`). For
  the cold-wake prompt, `PromptErrand` gains `surface` beside `input_mode`, which already rides the
  wake path for the same reason (`session/runtime/launch.py:134-150`), and `launch._deliver`
  passes it to its `AttachClient` (`:1243`). The empty default keeps every other producer
  unchanged.
- **Where it is read.** The runtime reads it once at auth time, next to the existing
  `"desktop"` check (`server.py:5416-5418`), for any `kind`. It never reads it from an op frame.
- **Invariant: only a process on this machine that holds the control key and is not relaying for
  another device can declare `mobile`.** The mesh relay forwards a viewer's `surface` verbatim
  (`network/dial.py:291-323`, `:385-387`), so slice 1b must make `dial_owner` drop a `mobile`
  value. The relay already refuses to take `locality` from the frame for the same reason
  (`:372-376`). **Check:** a unit test dials through `dial_owner` with `auth={"surface": "mobile"}`
  and asserts that the owner records `remote`.
- **The in-process owner (m1).** `Session.prompt` and `steer` default `input_surface="tui"`,
  mirroring `owner_typed=True` (`session.py:10392`, `:10727`). The server always passes an explicit
  value, so a phone-driven conversation then typed at the in-process owner flips to `tui`. It
  never inherits `mobile`. "Inherit" applies only to runs with **no** human input.

Other channels need no label of their own. Signal, Team Bridge, peers and `lop send` arrive as
non-user inputs (`session/session.py:18159-18165`), so they inherit the last driver, as Decision 1
says. A channel-only conversation has no driver and is `unknown`.

## 2. Routing matrix

Which surfaces fire for an item that has passed the existing gates: `unseen`; for completions and
errors, `notify` (including #4120's routine-silence), but **not** for needs-you items (§3); the master
switch, categories and quiet hours (ADR 0008 §3.5 order of gates); and a live device. The defaults are shown. "Held" means ADR 0008 §3.3 rules 1–5: push only if you
go away before you have seen it.

**"Desktop" in this table means the existing desktop banner ladder.** That is the feed banner
(`server/utils/desktop_feed.py:2039-2077`), the TUI rung, and the runtime's
`_announce_completion` (`session/runtime/serving.py:8184`). In every cell, a conversation already
on screen in an attended window raises nothing anywhere (rung 1, `desktop_feed.py:2075`).

| Kind ↓ · origin ↓ \ desk → | **active** | **away** | **unknown** (stale, untrusted, no report) |
|---|---|---|---|
| **Completion** (`complete`, `retired`) · **mobile** | Phone. **No** desktop banner¹ | Phone | Phone |
| Completion · **desktop / TUI / remote / channel / unknown** | Desktop | Desktop | Desktop |
| **Needs you** (open ask, pending approval) · **mobile** | Phone + desktop² | Phone + desktop | Phone + desktop |
| Needs you · **desktop / TUI / remote / channel / unknown** | Desktop; phone **held** | Phone (now) + desktop | Phone (now) + desktop |
| **Error** (`error`) · **mobile** | Phone. **No** desktop banner¹ | Phone | Phone |
| Error · **desktop / TUI / remote / channel / unknown** | Desktop; phone **held** | Phone (now) + desktop | Phone (now) + desktop |
| **Interrupted / closed** · any | None | None | None |
| **Team Bridge** message to you | ADR 0008 §3.3 desk rule (cloud), unchanged | ← | ← |

¹ **Desktop for mobile-origin completions and errors.** The desktop stays silent; the row still lands
unread in the sidebar, the inbox and the badge. If the phone would not emit, the desktop banners as it
does today, so that the item is never silent on every surface. "Would not emit" is **one shared
predicate**, `phone_would_emit(row, prefs)`, which both the desktop (core edit 4) and the worker's
`_is_candidate` and `_preference_gate` call. It is false when `enabled` is off, when the row's
category is off, when no live device wants it (`push_worker.py:1617-1660`), or when the worker's
other candidate gates refuse the row. It is a pure function of the row and
`push_devices.device_preferences(config_dir)`, which is a read-only file read, so the server
process can call it. A second hand-written copy of the fallback is how the two would drift.

² **Needs you on the desktop is not suppressed for any origin.** Blocked work is the one place a
duplicate is cheaper than a miss. The desktop's ask and approval banners are their own path
(`notifications/store.py:151`, `ask:` refs), and this ADR does not touch them.

**Departures from the brief's baseline, and why:**

- **`unknown` presence pushes needs-you now (inherited from ADR 0008).** Read literally, the request
  says to push "unless we can tell the user is not there", which would make `unknown` a desktop-only
  column. This ADR keeps ADR 0008's reading instead: a stale, untrusted or missing report is treated
  as not active (`0008:180`, `:244-245`). A blocked task the phone never hears about is the costlier
  miss. If `unknown` turns out to fire while the operator is at the desk, the fix belongs in ADR
  0008's predicate, not here.

- **Mobile-origin needs-you pushes regardless of presence.** The brief's paraphrase says that
  needs-attention items "from any origin" push only when the desk is away. The operator's own
  words split it by origin: "the mobile app can notify … for **desktop/other started** sessions …
  when there is an ask/approval", and "if started on mobile it should notify on mobile". A
  mobile-origin conversation that is waiting on you belongs to the phone.
- **Errors route like needs-you for non-mobile origins.** The turn failed and the work is not done,
  which matches "something that requires the user's attention". `interrupted` was a deliberate stop,
  and it stays silent everywhere. That is already true: `BRIDGE_NOTIFIABLE_KINDS =
  {complete, error, retired}` (`server/utils/desktop_sessions.py:697`), and the push worker inherits
  it (`push_worker.py:925-929`).

## 3. Interplay with existing machinery

- **`notify` and `no_reply` (§14.2), and #4120: unchanged, and they run first.** The run's `notify`
  is computed once (`session.py:18444-18520`, stamped at `:20332`). It already silences wake and
  monitor runs, peer-only runs and `no_reply` ends. #4120 adds routine `ask_response`, `job_result`
  and session-notice runs. For **completions and errors**, origin routing never turns a
  `notify = false` row back on. It only decides **where** a `notify = true` row goes.
- **Needs-you is the one exception: it bypasses `notify`.** `notify` answers "was this run worth a
  completion banner?", and it is false for exactly the runs that end on an open ask without a typed
  prompt. `_finalize_attention_notify` (`session.py:18444-18522`) silences wake- and monitor-only
  runs, peer-only runs, `no_reply` ends and proactive-vetoed runs (`:18500-18522`). #4120 adds
  `job_result` and notice runs. The only "user is waiting" input it reads is `_has_awaiting_user`
  (`:18431-18442`), which counts **queued typed messages**, not open asks. A wake run that ends on
  `ask_user` would therefore never reach the phone, even when the desk is away. That case is the
  request's "desktop/other started … ask/approval" exactly. So:
  - the run end stamps `needs_user` **independently** of `notify`, as true when the session has an
    open ask (`asks.store.open_asks`, `asks/store.py:1067`) at run end;
  - a `needs_user` row is governed **only** by the new `attention` preference and the matrix's
    needs-you rows. It never passes the `notify` gate and never the `completions` category
    (§3, push-worker edits 1 and 4);
  - its desktop side is unchanged: `notify` still decides the completion banner, and the ask has
    its own banner (footnote 2).
  #4120 is orthogonal for completions, and it does not reach needs-you rows by construction. Either
  can merge first.
- **#4101 deferral, and ADR 0008 rules 1–5: kept as the mechanism, narrowed in scope.**
  `_add_completion` sets `deferred_since` (`push_worker.py:994-1001`), `_settle_deferred` drops
  (`:1028-1087`) and `_due` releases (`:1262-1283`). That machinery now applies only to non-mobile
  **needs-you and error** items. Mobile-origin items are never held. Non-mobile completions never
  become candidates, so the hold is moot for them.
- **ADR 0008 `desk_active`: unchanged.** It is still the only presence predicate (§3.2), and the
  §3.5 "away after N min" setting still defines "away" in the matrix.
- **Team Bridge: unchanged.** Messages addressed to you notify under ADR 0008 §3.3 and slice 3.
  Origin does not apply, because a Team Bridge message is someone talking to you.

### What #4145 must change

**Nothing is needed for #4145 to merge.** Its hold, settle and release code is exactly the
machinery that needs-you and errors will use. Until origin exists, it is a strict improvement for
completions over today's focus rule. Folding origin into #4145 would add the runtime stamp and an
`attention.db` column to a PR already in review, and would reset its rounds. The routing therefore
lands as **core slice 1b**, with these edits to `local_operator/mobile/push_worker.py` (lines at
`9134015c`):

1. **`_is_candidate` (`:882-894`).** Read `state["origin"]` and `state["needs_user"]`, which are new
   store columns (core edit 3 below), and `state["kind"]`, which already exists (`:894`). The gates
   become, in order:
   - `unseen`, as today.
   - **Needs-you first.** If `needs_user` is set, the row is a candidate when `attention != "never"`,
     **whatever `notify` says** (§3). It still passes `_desktop_would_announce`'s kind and
     `session_may_announce` gates, so a hidden subagent's ask stays hidden.
   - Otherwise `notify`, as today.
   - For `complete` or `retired`, the row is a candidate only if `origin == "mobile"` and
     `completions_scope == "phone"`, or if `completions_scope == "all"`.
   - For `error`, the row is a candidate whatever the origin, subject to `errors`.
   - **The parity gate `_desktop_would_announce` (`:896-941`) splits by origin.** For a
     mobile-origin row it skips only `notifications_enabled()` (`:931`). That is the desktop's own kill
     switch, and a user who turned desktop banners off still wants the phone to hear about what they
     started there. The kind gate and `session_may_announce` still apply. For every other row it is
     unchanged. The split lives in the worker's call. `session_may_announce` itself
     (`serving.py:534`) is not touched, because the desktop banner shares it.
   - A non-candidate resolves without an emit and the cursor advances. That is the existing
     resolve-without-emit path the module header describes (`:28-36`).
2. **`_DeskGate.holds(kind)` (`:1956-1967`) becomes `holds(kind, origin)`.** It returns `False` when
   `origin == "mobile"`, so the item is pushed now. Otherwise it is today's body. The call site at
   `:998` passes the row's origin.
   - With `completions_scope == "all"`, non-mobile completions keep ADR 0008's hold. That is the
     "all" setting's meaning.
   - With `attention == "always"`, `holds` is `False` for needs-you. With `"away"` (the default),
     needs-you of non-mobile origin keeps ADR 0008's hold.
3. **Mobile-origin items on screen.** Before the first attempt, resolve the item if
   `self._attending(session_id)` (`:1028-1087` already reads it). The card is in front of you on an
   attended desktop. This is rung 1, and it is the only presence fact that suppresses a
   mobile-origin push.
4. **`_preference_gate` (`:1617-1660`).** Add a third category. Today every non-`error` kind maps to
   `completions` (`:1634-1636`), so "Agent finished: Off" would also mute an ask. A `needs_user` row
   maps to **`attention`** instead, and it is wanted when the device's `attention != "never"`. It is
   never judged by `completions`. Add `completions_scope` and `attention` to the per-computer "any
   live device wants it" evaluation. Completion emits cannot target or exclude a device
   (`:1640-1650`), so the most permissive live device wins, exactly as `completions` does today.
   This `attention` key is unrelated to the existing `attention` emit type. That emit is a silent
   badge correction (`:186-196`), and it stays governed by `enabled` alone (`:1638`).
5. **Not changed:** `_due`, `_desk_gate` and its one-release legacy branch (`:707-726`), the burst
   and digest rules, and `_settle_deferred`'s seen-at-desk drop.

**Other core edits in slice 1b, outside the push worker:**

1. `server.py:8998` and `:9080`. Derive the origin from `authority` (Decision 1 vocabulary), after
   adding `surface == "mobile"` to the auth-time derivation (`:5416-5418`). Pass it as
   `input_surface=` to `h.prompt` and `h.steer`, probed by signature exactly as `owner_typed` is.
   Do the same in the `ask_answer` (`:9429`) and `approval_answer` (`:9334`) ops. On the mobile
   side, the daemon declares `surface: "mobile"` on its four dial sites and `PromptErrand.surface`.
   `network/dial.py` drops a forwarded `mobile` (Decision 1, "How the tag is declared").
2. `Session`. Stamp `provider_payload["lop_input_surface"]` on the user row, beside
   `REMOTE_PROMPT_KEY` (`session.py:418-430`). `prompt` and `steer` take
   `input_surface: str = "tui"` (the in-process owner's default, beside `owner_typed=True` at
   `:10392`, `:10727`). `_note_run_input` (`:18120-18183`) records the run's latest stamp. The conversation's last driver is rebuilt on resume from the newest stamped row, in
   the same way as `_reconstruct_profile_trust` (`:468`).
3. `AgentEndEvent`. Gains `origin` and `needs_user` beside `notify` (`session.py:20332`).
   `needs_user` is computed at run end from `asks.store.open_asks` (`asks/store.py:1067`), separately
   from `_finalize_attention_notify` (§3). Both are carried in the `attention_completed` marker as
   `notify` is (`local_operator/session/attention.py:1193`, `session.py:17854`). The `completions`
   table gains `origin TEXT NOT NULL DEFAULT ''` and `needs_user INTEGER NOT NULL DEFAULT 0` by the
   existing `ALTER` pattern (`local_operator/session/attention.py:1607-1619`). Both are written in
   `publish` and in the heal `UPDATE` (`:2284`). `''` reads as `unknown`.
4. `desktop_feed._focus_policy_for` (`desktop_feed.py:2039`) and `_announce_completion`
   (`serving.py:8184`). Return no banner for a mobile-origin `complete`, `retired` or `error` row
   when `phone_would_emit` is true (footnote 1). That is the same predicate the worker calls, never
   a re-derivation of "a live device wants the category". Otherwise today's rule applies.
5. `push_devices.PREFERENCE_KEYS` (`mobile/push_devices.py:481`). Add `completions_scope`
   (`phone` | `all`, absent → `phone`) and `attention` (`away` | `always` | `never`, absent → `away`).
   The model is boolean-only today, so this is a schema change, not just two names:
   - The resolver `bool(stored.get(key, True))` (`:1082`) becomes a per-key table of allowed values
     and absent-defaults. An unknown stored value resolves to that key's default, never to `True`.
   - The validator's "must be true or false" check (`:1683-1686`) becomes per-key, and it refuses an
     enum value outside the allowed set.
   - `device_preferences`' return type `dict[str, dict[str, bool]]` (`:1085`) widens to match.
   - The capability `push_routing` is advertised, because the daemon refuses unknown keys
     (`:1679-1682`; `notification-preferences.ts:12-14,27-33`).

## 4. Settings on the phone

These are additions to the existing model, not a second one. The phone's `NotificationPreferences`
(`src/notifications/notification-preferences.ts:56-76`) and the core's `PREFERENCE_KEYS` are the
only stores. Settings → Notifications (`src/features/settings/notifications-section.tsx:336-410`)
becomes:

| Row | Choices (default **bold**) | Model |
|---|---|---|
| Notifications (master) | on / off | `enabled`, unchanged |
| **Agent finished** | **Conversations I started on my phone** / All conversations / Off | Off = `completions: false`. Otherwise `completions: true` plus the new `completionsScope: "phone" \| "all"` (wire `completions_scope`) |
| **Needs your attention** (questions and approvals) | **When I'm away from my computer** / Always / Never | new `attention: "away" \| "always" \| "never"`. Independent of "Agent finished": turning that row Off never mutes a question (§3, push-worker edit 4) |
| Agent hit an error | **on** / off | `errors`, unchanged. Routing follows the matrix |
| Show conversation name and preview | **on** / off | `previews`, unchanged |
| Send to phone when I'm away for [1/**2**/5/10] min | per computer | ADR 0008 §3.5 `notifications.phone_away_after_s`, unchanged. It defines "away" for the rows above |
| Team Bridge messages | **on** / off | `teamBridge`, app-only, unchanged |

- **"My phone", not "this phone".** Origin is `mobile` with no device id, and completion emits fan
  out to every device of the computer (`push_worker.py:1640-1650`). With two phones, both get it.
  Per-device targeting needs a cloud wire change (an `exclude` or a target on completion emits) and
  is not in this ADR.
- **The capability gate follows the `previews` pattern** (`notification-preferences.ts:15-21,143-152`).
  The two new keys are sent only to a daemon that advertises `push_routing`. On an older daemon,
  the rows show as disabled with the existing "update the computer" note.
- **A new daemon applies the new defaults to an old app that sends neither key.** This is
  deliberate: the defaults are the operator's policy, not opt-in.
- **"Needs your attention"** replaces `notification-preferences.ts:33`'s "No 'Needs your input'
  switch" note. That note is true today because asks arrive only as ordinary completions.
- **`docs/ux/flows.md:663`** already lists "when a session needs a decision" and "when a turn
  finishes". The slice updates that row to these labels.

## 5. Changes to the ADR 0008 slice plan

| Slice | Change |
|---|---|
| **1 — core (#4145)** | **None.** Merge as reviewed. |
| **1b — core: origin, completion routing and needs-you at run end (new, M)** | Edits 1–5 and push-worker changes 1–4 in §3, **including the `needs_user` stamp and its routing**, which an earlier draft put in 1c. 1b must not ship without it: today an ask reaches the phone only as an ordinary completion (`notification-preferences.ts:33`). 1b makes non-mobile completions non-candidates under the default `phone` scope, so on its own it would stop desktop-started asks reaching the phone at all. Putting the stamp in 1b closes that gap with the real mechanism, where an interim "keep open-ask rows as candidates" rule would be thrown away one slice later. **Acceptance (unit, injected clock and presence):** a phone prompt over the daemon socket stamps `mobile`, and so do a phone cold-wake prompt (`PromptErrand.surface`) and a cold ask answer; a desktop attach stamps `desktop`; a local `attach` stamps `tui`; a direct `Session.prompt` stamps `tui`; a daemon-kind `locality: local` connection stamps `unknown`; `dial_owner` with `surface: "mobile"` stamps `remote`; a phone steer into a desktop run flips that run; a phone-driven conversation then typed at the in-process owner flips to `tui`; a wake run inherits; a legacy row reads `unknown`. A mobile-origin completion pushes while `desk_active`, is resolved when attending, and still pushes with `notifications_enabled()` false. A desktop-origin completion never pushes under `phone` and is held under `all`. A desktop-origin error is held and released on away. **A wake run that ends on an open ask pushes when away, with `completions: false` and `notify = false`**; it is held while `desk_active` under `attention: away`, pushes at once under `always`, and never pushes under `never`. The desktop banner is silent for mobile-origin only while `phone_would_emit`. An enum preference value outside its set, and either new key without the capability, return 422. **QA real path:** isolated HOME, serve plus daemon, the transport stubbed to record emits. Prompts go over a `daemon`-kind connection, over the cold-wake path and over a desktop `attach`. One wake-driven run ends on `ask_user`. |
| **1c — core: needs-you mid-turn (new, S→M)** | **Mid-turn approvals and parks** have no completion, so they need a new emit sourced from the projection the daemon already serves (`needs_attention`/`pending_kind`, `mobile/daemon.py:1761-1762`) and keyed by `request_id`. It is governed by the `attention` preference and the needs-you matrix rows, exactly like 1b's run-end stamp. It depends on 3b. There is no regression window here: mid-turn approvals do not reach the phone today either. The worker composes only completion, digest and the silent badge-correction `attention` emit (`push_worker.py:186-196`). |
| **2 — local-operator-ui** | Unchanged. |
| **3 — agent-server** | Unchanged. |
| **3b — agent-server: `needs_you` emit type (new, S)** | Add a type next to `completion`/`attention`/`digest` (`internal/sessionpush/wire.go:24-28,236`), keyed by `request_id`, with a shared fixture. Only 1c depends on it. |
| **4, 5** | Unchanged. |
| **6 — local-operator-mobile** | Add the two §4 rows and the `push_routing` gate. Update the `notification-preferences.ts` header and `flows.md:663`. **Acceptance:** the settings component in loading, error, legacy-daemon (disabled) and set states; `wirePreferences` omits the keys without the capability; rendered before/after stills (design round). |

**Order:** 1 → 1b; 6 merges **before or with** 1b; 3b → 1c. #4120 is independent.

- **Why 6 is not after 1b.** 1b applies the new defaults as soon as it is released. "All
  conversations", the R7 remedy, is reachable only from 6. Slice 6 is gated on the `push_routing`
  capability, so it can ship first: until a daemon advertises the capability, its rows show
  disabled. If 6 cannot ship in time, the window is accepted with a stated workaround and noted in
  1b's release notes. The workaround is that the operator can leave "Agent finished" on, so that
  phone-started work still pushes. Desktop-started completions are then silent on the phone until
  6 lands.
- **The F2 invariant.** No release may contain 1b without the `needs_user` stamp. That holds by
  construction now that both are in one slice.

## 6. Risks to watch during rollout

- **R7 — Fewer notifications is the point, and a miss is the failure.**
  - **Watch for:** the operator reporting "a desktop task I was waiting on finished and nothing
    told me" while away.
  - **Remedy:** the "All conversations" choice exists for that. It is reachable once slice 6 is
    out, and §5 orders 6 before or with 1b for this reason. If it recurs with the defaults, revisit
    treating `unknown` as non-mobile.
- **R8 — Mixed versions.** A runtime started before 1b keeps old code in memory, and its completions
  carry `origin = ''`, which reads as non-mobile. A phone-started conversation on such a runtime
  stops pushing completions until the runtime is replaced at the next update window.
  - **Why it is accepted:** it errs quiet, which is the policy's direction, and it lasts one
    runtime lifetime.
  - **The daemon's own skew.** A mobile daemon that predates the `surface: "mobile"` tag still
    reads as `mobile` on its live path (`daemon` plus `remote`, vocabulary row 2). Its cold-wake
    prompts read `tui`, and its cold answers read `remote`. Both err quiet, and both end when the
    daemon restarts on the new build.
- **R9 — The web portal counts as mobile.** It reaches the runtime through the same mobile
  daemon. A portal opened on a laptop browser would therefore route as `mobile`.
  - **Why it is accepted:** the daemon is the phone surface by design.
  - **Remedy if reported:** the daemon can pass a client hint, but it must be daemon-asserted,
    never taken from the frame.
- **R10 — Asks answered on the phone.** An answer flips the run to `mobile`, so the continuation's
  result pushes. That is intended. Note that #4120 marks routine `ask_response`-only runs
  `notify = false`, so a plain answer-and-acknowledge turn stays silent anyway.

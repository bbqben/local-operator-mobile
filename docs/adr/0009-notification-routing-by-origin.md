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
core `local-operator@9134015c` (the #4145 head; the cited files other than `mobile/daemon.py` are
byte-identical at `origin/main` `da8f3f04`); cloud `agent-server@48970fd9`; this repository
`@f390fdda`.

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
- The precedent for keeping it is `asks/surfaces.stamp_answer_surface` (`asks/surfaces.py:107-133`),
  which stamps an ask answer from the connection rather than the frame. Its labels are tuned for
  consent, though: the phone and a mesh peer both read `remote`. Routing needs the raw kind.

**Remote sessions.** A completion on a mesh node does not reach the phone at all today
(`remote_attention.py:99-104`: "a remote completion does not reach the phone yet"). Phone commands
target only this computer's own runtimes (`mobile/daemon.py:9662`).

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
- **A remote session started from the phone** cannot happen today. When remote completions gain a
  push source, origin will be judged **on the head device**, the one that relayed the prompt. The
  node's `mesh.json` will not be used for this.
- **Origin is per run.** It is sticky per conversation only for runs without human input.

**Vocabulary**, derived from the connection only:

| Connection | Origin |
|---|---|
| `kind == "daemon"` | `mobile` (the native app or the phone web portal, both through the mobile daemon) |
| `kind == "attach"`, `locality == "remote"` | `remote` |
| `attach`, `surface == "desktop"` | `desktop` |
| other `attach`, or the in-process owner TUI | `tui` |
| none of the above | `unknown` |

Other channels need no label of their own. Signal, Team Bridge, peers and `lop send` arrive as
non-user inputs (`session/session.py:18159-18165`), so they inherit the last driver, as Decision 1
says. A channel-only conversation has no driver and is `unknown`.

## 2. Routing matrix

Which surfaces fire for an item that has passed the existing gates: `unseen`; `notify`, including
#4120's routine-silence; the master switch, categories and quiet hours (ADR 0008 §3.5 order of gates);
and a live device. The defaults are shown. "Held" means ADR 0008 §3.3 rules 1–5: push only if you
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
unread in the sidebar, the inbox and the badge. If no live phone device would receive the push (the
category is off, or no device is live, `push_worker.py:1617-1660`), the desktop banners as it does
today, so that the item is never silent on every surface.

² **Needs you on the desktop is not suppressed for any origin.** Blocked work is the one place a
duplicate is cheaper than a miss. The desktop's ask and approval banners are their own path
(`notifications/store.py:151`, `ask:` refs), and this ADR does not touch them.

**Departures from the brief's baseline, and why:**

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
  and session-notice runs. Origin routing never turns a `notify = false` row back on. It only
  decides **where** a `notify = true` row goes. #4120 and this ADR are orthogonal, and either can
  merge first.
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

1. **`_is_candidate` (`:882-894`).** After `unseen`, `notify` and `_desktop_would_announce`, add the
   origin gate. Read `state["origin"]` and `state["kind"]`, which are new store columns (core edit 3
   below).
   - For `complete` or `retired`, the row is a candidate only if `origin == "mobile"` and
     `completions_scope == "phone"`, or if `completions_scope == "all"`.
   - For `error`, the row is a candidate whatever the origin, subject to `errors`.
   - A non-candidate resolves without an emit and the cursor advances. That is the existing
     resolve-without-emit path the module header describes (`:28-36`).
2. **`_DeskGate.holds(kind)` (`:1956-1967`) becomes `holds(kind, origin)`.** It returns `False` when
   `origin == "mobile"`, so the item is pushed now. Otherwise it is today's body. The call site at
   `:998` passes the row's origin.
   - With `completions_scope == "all"`, non-mobile completions keep ADR 0008's hold. That is the
     "all" setting's meaning.
   - With `attention == "always"`, `holds` is `False` for needs-you.
3. **Mobile-origin items on screen.** Before the first attempt, resolve the item if
   `self._attending(session_id)` (`:1028-1087` already reads it). The card is in front of you on an
   attended desktop. This is rung 1, and it is the only presence fact that suppresses a
   mobile-origin push.
4. **`_preference_gate` (`:1617-1660`).** Add `completions_scope` and `attention` to the
   per-computer "any live device wants it" evaluation. Completion emits cannot target or exclude a
   device (`:1640-1650`), so the most permissive live device wins, exactly as `completions` does
   today.
5. **Not changed:** `_due`, `_desk_gate` and its one-release legacy branch (`:707-726`), the burst
   and digest rules, and `_settle_deferred`'s seen-at-desk drop.

**Other core edits in slice 1b, outside the push worker:**

1. `server.py:8998` and `:9080`. Derive the origin from `authority` (Decision 1 vocabulary). Pass it
   as `input_surface=` to `h.prompt` and `h.steer`, probed by signature exactly as `owner_typed` is.
   Do the same in the `ask_answer` (`:9429`) and `approval_answer` (`:9334`) ops.
2. `Session`. Stamp `provider_payload["lop_input_surface"]` on the user row, beside
   `REMOTE_PROMPT_KEY` (`session.py:418-430`). `_note_run_input` (`:18120-18183`) records the run's
   latest stamp. The conversation's last driver is rebuilt on resume from the newest stamped row, in
   the same way as `_reconstruct_profile_trust` (`:468`).
3. `AgentEndEvent`. Gains `origin` beside `notify` (`session.py:20332`). It is carried in the
   `attention_completed` marker as `notify` is (`attention.py:1193`, `session.py:17854`). The
   `completions` table gains `origin TEXT NOT NULL DEFAULT ''` by the existing `ALTER` pattern
   (`attention.py:1607-1619`). It is written in `publish` and in the heal `UPDATE` (`:2284`). `''`
   reads as `unknown`.
4. `desktop_feed._focus_policy_for` (`desktop_feed.py:2039`) and `_announce_completion`
   (`serving.py:8184`). Return no banner for a mobile-origin `complete`, `retired` or `error` row
   when a live device wants the category (footnote 1). Otherwise today's rule applies.
5. `push_devices.PREFERENCE_KEYS` (`mobile/push_devices.py:481`). Add `completions_scope`
   (`phone` | `all`, absent → `phone`) and `attention` (`away` | `always` | `never`, absent → `away`).
   Advertise the capability `push_routing`, because the daemon refuses unknown keys
   (`notification-preferences.ts:12-14,27-33`).

## 4. Settings on the phone

These are additions to the existing model, not a second one. The phone's `NotificationPreferences`
(`src/notifications/notification-preferences.ts:56-76`) and the core's `PREFERENCE_KEYS` are the
only stores. Settings → Notifications (`src/features/settings/notifications-section.tsx:336-410`)
becomes:

| Row | Choices (default **bold**) | Model |
|---|---|---|
| Notifications (master) | on / off | `enabled`, unchanged |
| **Agent finished** | **Conversations I started on my phone** / All conversations / Off | Off = `completions: false`. Otherwise `completions: true` plus the new `completionsScope: "phone" \| "all"` (wire `completions_scope`) |
| **Needs your attention** (questions and approvals) | **When I'm away from my computer** / Always / Never | new `attention: "away" \| "always" \| "never"` |
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
| **1b — core: origin + completion routing (new, M)** | Edits 1–5 and push-worker changes 1–4 in §3. **Acceptance (unit, injected clock and presence):** a phone prompt stamps `mobile` and a desktop attach stamps `desktop`; a phone steer into a desktop run flips that run; a wake run inherits; a legacy row reads `unknown`. A mobile-origin completion pushes while `desk_active` and is resolved when attending. A desktop-origin completion never pushes under `phone` and is held under `all`. A desktop-origin error is held and released on away. The desktop banner is silent for mobile-origin only while a device wants the category. Unknown preference values return 422 without the capability. **QA real path:** isolated HOME, serve plus daemon, one prompt over a `daemon`-kind connection and one over a desktop `attach`, with the transport stubbed to record emits. |
| **1c — core: needs-you source (new, S→M)** | **Turns that end on an open ask:** stamp `needs_user` on the completion when `asks.store.open_asks` (`asks/store.py:1067`) is non-empty for the session at run end. Route it by the needs-you row, sent as a `completion` emit with "needs your answer" copy. This needs no cloud change. **Mid-turn approvals and parks** have no completion, so they need a new emit sourced from the projection the daemon already serves (`needs_attention`/`pending_kind`, `mobile/daemon.py:1761-1762`) and keyed by `request_id`. It depends on 3b. |
| **2 — local-operator-ui** | Unchanged. |
| **3 — agent-server** | Unchanged. |
| **3b — agent-server: `needs_you` emit type (new, S)** | Add a type next to `completion`/`attention`/`digest` (`internal/sessionpush/wire.go:24-28,236`), keyed by `request_id`, with a shared fixture. Only 1c's approval half depends on it. |
| **4, 5** | Unchanged. |
| **6 — local-operator-mobile** | Add the two §4 rows and the `push_routing` gate. Update the `notification-preferences.ts` header and `flows.md:663`. **Acceptance:** the settings component in loading, error, legacy-daemon (disabled) and set states; `wirePreferences` omits the keys without the capability; rendered before/after stills (design round). |

**Order:** 1 → 1b → 6. 1b → 1c. 3b → 1c's approval half. #4120 is independent.

## 6. Risks to watch during rollout

- **R7 — Fewer notifications is the point, and a miss is the failure.**
  - **Watch for:** the operator reporting "a desktop task I was waiting on finished and nothing
    told me" while away.
  - **Remedy:** the "All conversations" choice exists for that. If it recurs with the defaults,
    revisit treating `unknown` as non-mobile.
- **R8 — Mixed versions.** A runtime started before 1b keeps old code in memory, and its completions
  carry `origin = ''`, which reads as non-mobile. A phone-started conversation on such a runtime
  stops pushing completions until the runtime is replaced at the next update window.
  - **Why it is accepted:** it errs quiet, which is the policy's direction, and it lasts one
    runtime lifetime.
- **R9 — The web portal counts as mobile.** It reaches the runtime through the same mobile
  daemon. A portal opened on a laptop browser would therefore route as `mobile`.
  - **Why it is accepted:** the daemon is the phone surface by design.
  - **Remedy if reported:** the daemon can pass a client hint, but it must be daemon-asserted,
    never taken from the frame.
- **R10 — Asks answered on the phone.** An answer flips the run to `mobile`, so the continuation's
  result pushes. That is intended. Note that #4120 marks routine `ask_response`-only runs
  `notify = false`, so a plain answer-and-acknowledge turn stays silent anyway.

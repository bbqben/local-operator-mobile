# ADR 0008 — Desk presence: the phone waits while you are at your computer

- **Status:** Proposed — 2026-11-16
- **Date:** 2026-11-16
- **Deciders:** the operator (the setting, its default, and the lock rule); the maintaining team
  (where the signal lives, and the wire)
- **Amends:** [ADR 0006](0006-push-and-ack-sync.md) §2.3, Decision 2 and its 2026-11-15 amendment.
  The *signal* changes from "a desktop window is focused" to "a person is using this computer", and
  the "desktop already announced it" drop now also needs evidence that someone was at the desk.
  ADR 0006 Decisions 1 and 3 are unchanged: the phone is still not a rung, it never calls
  `claim_delivery`, and gates 1, 2 and 4 stay as they are. A pointer will be added to ADR 0006
  §2.3 once open PR #282, which edits the same file, has merged. Until then, this ADR is the
  amendment.
- **Related:** core #4101 (`347ed722`, the desktop-presence lease this builds on), core #4120 /
  mobile #282 (which completions are eligible to notify at all; not changed here)

**Provenance.** Every citation is `repo@rev:path:line`, read with `git show <rev>:<path>` and not
from a working tree. The revisions are core `local-operator@72dd603f`, desktop
`local-operator-ui@3b3a8e4e`, cloud `agent-server@48970fd9`, and this repository `@08025e10`.

## The request

> "Can you also make it so that if the local operator app has activity, is actively focused, etc
> that the mobile app doesn't receive notifications redundantly since I'm already getting those on
> my desktop? It's a bit more nuanced so consider all the cases, like if there's been no activity
> for some time it might indicate that I've walked away from my desk with my phone, in which case we
> do notify, but if there's recent activity then don't notify, etc. Idk what the best signal would
> be to identify this but consider how apps like Slack do it, where they don't automatically send a
> notification to the phone when desktop activity is detected more holistically and the desktop
> notification is sent instead. Consider the best cross-platform way to do this" — operator,
> 2026-11-16

## 1. What "attended" means today, measured

### 1.1 The signal

"Attended" is **window state only**. It means the Electron main window is focused, visible and not
minimised:

- `local-operator-ui@3b3a8e4e:src/main/desktop-notifier.ts:987-1020`. `presence()` returns
  `window.isFocused()`, `isVisible()` and `isMinimized()`, plus the conversation on screen.
- `local-operator-ui@3b3a8e4e:src/main/desktop-feed.ts:470-508`. The app sends this to the backend
  on a fixed interval of `PRESENCE_INTERVAL_MS = 15_000` (`:77`). It also sends once when the feed
  connects. Focus, blur, lock and sleep do not trigger a send.
- `local-operator@72dd603f:local_operator/server/utils/desktop_presence.py:118-146` stores
  `focused`, `visible` and `minimized` for each feed subscription. The reader then computes
  `attended = has_window and focused and visible and not minimized`
  (`local_operator/session/runtime/presence.py:388-389`).
- **Lapse:** a report expires 45 s after its last beat (`PRESENCE_TTL_S = 45.0`, `presence.py:83`;
  beat `PRESENCE_BEAT_S = 15.0`, `:86`). Presence ends only when (a) the window loses focus, is
  hidden or is minimised, or (b) the app stops beating. **No idle, lock, sleep or display signal
  exists anywhere.** In the desktop app, `powerMonitor` is used only for the update checker's
  `resume` (`src/main/update-service.ts:2760`). The core has no `HIDIdleTime`,
  `GetLastInputInfo` or `IdleHint` (searched `origin/main`).
- **TUI:** never consulted on purpose (`local_operator/mobile/push_worker.py:1870-1883`, and ADR
  0006 review M3).

### 1.2 How the phone uses it (core #4101)

- On each pass, `tick()` reads `attended` once (`push_worker.py:535-538`).
- A completion collected **while attended** gets `deferred_since` (`:952-953`). A completion
  collected while **not** attended is due at once (`_due`, `:1209-1213`).
- A deferred item is dropped if the desktop *announced* it (`AttentionStore.delivered`,
  `session/attention.py:1958`), or if an attended window is showing that conversation
  (`DesktopPresence.attending`, `presence.py:171-184`). That is `_settle_deferred`,
  `push_worker.py:982-1016`. Otherwise it is released only when `attended` turns false. There is no
  time bound (`:133-147`).
- The desktop banner gate reads the same `attending` predicate
  (`server/utils/desktop_feed.py:2075-2077`). It returns `None` for the conversation on screen
  and `"always"` for every other one.

### 1.3 Team Bridge

Team Bridge pushes are **not presence-gated at all**:

- The cloud writes the outbox row with `NextAttemptAt: msg.CreatedAt`
  (`agent-server@48970fd9:internal/repositories/bridge_push_repository.go:526-530`), so it is sent
  immediately.
- `canDeliver` checks only org authority, recipients and the **read cursor**
  (`LastReadSeq < row.Seq`, `internal/services/bridge_push_job.go:248-302`). That is read
  suppression, which is good, but nothing knows whether the person is at a desk.
- Meanwhile the desktop app raises its own Team Bridge banner. It polls every 30 s
  (`local-operator-ui@3b3a8e4e:src/shared/team-bridge-poll.ts:2`) and stays quiet only when a
  focused window is showing that conversation (`src/main/team-bridge-notifier.ts:33,644`). So every
  Team Bridge message you receive at your desk buzzes the phone as well.

### 1.4 Gaps, case by case

| # | Situation | Today | What should happen |
|---|---|---|---|
| G1 | At the desk, working in **another app** (editor, browser). Lop window not focused. | Not attended, so the phone is pushed **at once**. The desktop banners too. **Duplicate.** This is the operator's complaint. | Desktop banner only. |
| G2 | Lop window left focused, user **walks away** | Attended indefinitely, so deferred items are held with no bound. Worse, every completion for a conversation not on screen is bannered to an empty desk, `delivered` becomes true, and `_settle_deferred` **drops the phone push for good**. | Push once you have been away for N minutes. |
| G3 | Screen **locked** | No signal. Behaves like G1 or G2 depending on focus. | Treat as away at once. |
| G4 | **Display off**, or idle with no lock | No signal | Covered by idle time (the display sleeps only after idle). |
| G5 | **System asleep** | Core on the same Mac sleeps too, so nothing is computed until wake. Then G1/G2 apply. A remote-paired backend lapses after 45 s, so it pushes. | Wake: flush using the post-wake idle. A remote backend should learn about sleep at once, not after 45 s. |
| G6 | **TUI-only** user, or the app is closed | No lease, so not attended, so the phone is pushed at once. The TUI banner (rung 3) or the runtime banner (rung 4) also fires. **Duplicate.** | Same desk rule, from a core-side idle probe. |
| G7 | **Multiple Macs** | Each computer's worker reads only its own backend's lease. A desktop app paired to a remote backend beats *that* backend, so it counts there. | Correct as is: a Mac whose app does not show B's work should not keep B's pushes. Team Bridge, being account-wide, needs "any desk active". |
| G8 | **Phone in active use** | No `setNotificationHandler` (`src/notifications/native.ts:19-23`). Per Expo's documented default, a foreground arrival shows an OS banner with sound. | §3.4 |
| G9 | **Team Bridge** at the desk | Immediate push plus desktop banner (§1.3). **Duplicate.** | Same desk rule, enforced in the cloud. |
| G10 | Desk active, but this machine **cannot banner** that kind (no feed, permission denied, kind not advertised) | Deferred if attended, so the user at the desk hears nothing anywhere. | Push now. The phone is the only surface that can notify. |

## 2. What Slack does (cited)

- **Default timing.** "By default, you'll receive mobile notifications **one minute after locking
  your desktop screen or 10 minutes after Slack stops detecting cursor activity**. You can choose to
  receive mobile notifications as soon as they're sent, as soon as you're inactive, or after an
  additional delay." Source: Slack Help, *Configure your Slack notifications*, § "Choose mobile
  notification timing" (<https://slack.com/help/articles/201355156>), read 2026-11-16. The setting
  is labelled "When I'm not active on desktop". The brief's figure of "about 1–2 min of inactivity"
  matches Slack's *lock* rule, not its cursor rule, which is 10 minutes.
- **Availability.** "You're set to away after 10 minutes of desktop inactivity, or if you navigate
  away or close the app on your mobile device." Source: Slack Help, *Set your Slack status and
  availability* (<https://slack.com/help/articles/201864558>).
- **Read anywhere suppresses.** Mobile notifications are for **unread** activity, and the badge
  counts unread messages. Source: Slack Help, *Guide to Slack notifications*
  (<https://slack.com/help/articles/360025446073>). We already do this: a read acks `unseen` in the
  core (ADR 0006 §3), and the cloud checks the read cursor for Team Bridge.

**What we take from Slack:**
1. The signal is **OS-level input activity**, not window focus.
2. **Lock** is a strong "left" signal that overrides idle.
3. There is **one user-facing delay**.
4. **Read on any device suppresses.**

**Where we differ:**
- **Default delay.** The operator asked for 2 minutes. Slack's 10 minutes suits chat that keeps
  flowing. Here a finished agent turn is the thing you walked away waiting for.
- **Lock is immediate.** Slack waits 1 minute after lock. We use 0 s (§3.2).

## 3. Decision

### 3.1 The signal set, and where it lives

Three options:

| Option | Covers | Fails |
|---|---|---|
| **A. Desktop app (Electron main) reports OS idle and lock** | macOS, Windows and Linux through one API: `powerMonitor.getSystemIdleTime()` (seconds, all platforms), `getSystemIdleState(t)` (`active`, `idle`, `locked` or `unknown`), and the `lock-screen`, `unlock-screen` (macOS, Windows), `suspend`, `resume` and `user-did-resign-active` (macOS) events. The idle reading is taken **on the machine the user sits at**, which is correct even when the app is paired to a remote backend. Electron documents all of these (<https://www.electronjs.org/docs/latest/api/power-monitor>). | TUI-only use, and use with the app closed (G6). On Linux under Wayland the reading has been unreliable (risk R2). |
| **B. Python core probes OS idle** | TUI-only use, and use with the app closed. macOS: `CGEventSourceSecondsSinceLastEventType` through ctypes, or `ioreg` `HIDIdleTime`. Spiked on this Mac 2026-11-16: both return sub-second values from a background process with no added dependency. Windows: `GetLastInputInfo`. Linux: logind `IdleHint`, otherwise unknown. | It reads the wrong machine whenever the core runs headless or remote, or as a Windows service in session 0. Those cases must report "unknown", which leans towards notifying. |
| **C. Window focus (today)** | Nothing that A does not cover better | G1 and G2 |

**Recommendation: A is the primary signal, B is the fallback for TUI or app-closed use, and C is
kept only as the rung-1 "which conversation is on screen" fact.** Window focus remains the right
answer to "is this card already on screen". It is the wrong answer to "is a person at this
computer".

**Privacy:** the wire carries only integer idle seconds, a `locked` boolean and the user's
threshold. It never carries keystrokes, event types, foreground app names or input coordinates.

### 3.2 The one predicate

The desktop app sends the raw facts it measured. A receiver turns them into a deadline using its
**own** receive clock, so clock skew between machines and between a Mac and the cloud cannot move
the answer:

```
beat (sent with every presence beat, plus immediately on lock, unlock, suspend, resume and resign-active):
  idle_s        integer, from getSystemIdleTime()
  locked        bool: getSystemIdleState(away_after_s) == "locked", or a lock/suspend/resign event since the last unlock or resume
  idle_trusted  bool (see R2); false means the idle reading is unknown
  away_after_s  the operator's setting (60 | 120 | 300 | 600), default 120

receiver, on receipt at its own time t_r:
  last_input_at = t_r - idle_s
  away_at       = t_r if locked else last_input_at + away_after_s

desk_active(now)  = fresh(report, PRESENCE_TTL_S) and idle_trusted and not locked and now < away_at
desk_unknown(now) = not fresh, or not idle_trusted    →  treated as NOT active (notify)
```

`desk_active` is the **only** presence predicate the phone path reads, for both agent completions
and Team Bridge.

The **policy** lives in one place: the desktop app chooses the threshold, the lock rule and the
trust rule. Core (Python) and cloud (Go) only evaluate `now < away_at` on a fresh report. That
evaluation is short enough to be the same in both languages, and a shared fixture table enforces
that (§4, acceptance tests).

When several reports are live, aggregate with **any**. On one backend, take the latest `away_at`
across the live leases; in the cloud, across the account's computers. If you are at any desk this
backend serves, or for Team Bridge any desk at all, you are at a desk.

**Lock is 0 s:**
- **Why:** locking is a deliberate "I'm leaving", and the operator's example is walking away with
  the phone.
- **What it costs:** a quick lock and unlock can let through a push for a completion that landed in
  that window.
- **How to change it:** the grace is one constant, `LOCK_GRACE_S`, so moving to Slack's 60 s is a
  one-line change.

### 3.3 The rule built on it (same for completions and Team Bridge)

At **arrival** (core: `_queue_completion`; cloud: outbox claim), for an item that passes the
existing gates (unseen, `notify`, preferences, a live device):

1. If `desk_active(now)` **and** this desk can banner the item, **hold** it. "Can banner" means
   `presence.delivers(kind)` for completions, or `bridge_banners` in the report for Team Bridge.
   This closes G1, G6 and G9.
2. Otherwise **push now**. This covers G2 after the threshold, G3, G5, G10, and every unknown or
   stale report.

While **held**, check on every pass:

3. **Read anywhere:** drop. This is today's ack path for completions and today's read cursor for
   Team Bridge.
4. **Seen at the desk:** drop. The desktop *surfaced* the item, and there was **input after it**:
   `last_input_at > surfaced_at + SEEN_GRACE_S` (2 s).
   - *Surfaced* means today's evidence. For completions, `_settle_deferred` either found
     `delivered` (a banner claimed) or found `attending` (the card was on screen). The worker
     records the time it first observed this in memory, on `_PendingEmit`, so `deliveries` needs
     no schema change. For Team Bridge, surfaced means the message's `created_at` +
     `TEAM_BRIDGE_NOTIFY_POLL_MS`, provided the report claimed `bridge_banners`.
   - This replaces #4101's unconditional "announced means drop". That rule is what lets G2
     silence the phone after a banner shown to an empty desk.
5. **Desk went away** (`not desk_active(now)`): release. The push carries the same burst and digest
   rules as today (`BURST_LIMIT`, `BURST_WINDOW_S`).

Read in words: if it arrives while you are working, the desktop tells you and the phone stays
quiet. If it arrives and you stop touching the computer before you have seen it, the phone gets it
`away_after` after your last input. If it arrives while you are away or the screen is locked, the
phone gets it at once.

**Version skew.** If a report carries no idle fields (a desktop app from before this change), the
core falls back to today's focus rule unchanged for **one release**, so nothing regresses. After
that, a missing field is read as unknown, which means notify.

### 3.4 Phone in the foreground: in-app, not push

**Decision: the phone being in the foreground does not feed `desk_active`.** The phone's own state
says nothing about the desk, and adding it would send a third presence to the cloud.

What changes is **presentation on the phone**:
- **Today:** Expo shows a foreground arrival as an OS banner with sound when no handler is set.
  Expo documents this under `setNotificationHandler`: "Until the app sets a handler … the
  notification is shown with a banner … with a sound".
- **After ADR 0006's S9 in-app surface ships:** set a handler that suppresses the OS banner and
  sound for every foreground arrival, and render the in-app toast instead. Arrivals for the
  conversation already on screen are not shown at all, because the card is already there.
- **Before S9:** keep the default. Suppressing with nothing in its place is the "notifications stop
  silently" failure `native.ts:19-23` already refuses.

### 3.5 Settings, and how they fit with the existing preferences

- **One new control.** Label: "**Send to phone when I'm away from my computer for [1 / 2 / 5 / 10]
  min**". Default **2**.
  - It is a **computer** setting, not a phone setting, because it describes the desk. It is stored
    in core config as `notifications.phone_away_after_s`.
  - It is edited from desktop Settings → Notifications and from the phone's Settings →
    Notifications row for that computer, through a daemon route.
  - The desktop app reads it and sends it as `away_after_s`. The core and the cloud therefore never
    need the setting themselves; they read the deadline.
- **Order of gates.** Order: `enabled`, then `completions` / `errors` / `previews`
  (`push_devices.PREFERENCE_KEYS`), then quiet hours. These decide **whether** an item may go to
  the phone. This setting decides **when**: presence is checked only after the preference gates
  pass. A category that is off is never held and never released.
- **The old toggle goes.** ADR 0006's "don't notify while I'm at the computer" toggle
  (`docs/ux/flows.md:663`) never shipped as code (ADR 0006 §2.3 amendment). This setting replaces
  it, and the flows table is updated to say so.
- **No "never while at the computer" option.** That is what this rule already does.
  "Immediately, even at the computer" (0) is left out on purpose, because the operator did not ask
  for it. Adding it later is one more entry in the list.

## 4. Implementation plan, by repository

Sizes use the team's lanes: S is under 2 h, M is up to 3 h, L is 3–4 h. Each slice is one PR.
Order: 1 → 2 → (3 ∥ 4) → 5.

### Slice 1 — local-operator-ui: measure and report (M)

- In `desktop-feed.ts`, the beat payload gains `idle_s`, `locked`, `idle_trusted` and
  `away_after_s`, sampled in main from `powerMonitor` on every beat.
  - Send an **immediate** beat on `lock-screen`, `unlock-screen`, `suspend`, `resume` and
    `user-did-resign-active`. Today only the 15 s interval sends (`desktop-feed.ts:502-506`).
  - `idle_trusted` (R2): true on macOS and Windows. On Linux, false until the app has once observed
    `idle_s ≥ 30` since launch. A constant 0 would otherwise mean "always at the desk", which fails
    in the unsafe direction.
- The setting: a select in Settings → Notifications, kept in core config and read through the
  existing config route.
- Contract: the four fields are additive optional fields in `desktop-contract.ts`, mirrored from
  core.
- **Acceptance:** unit tests with an injected `powerMonitor` fake:
  - idle, lock and unlock map to the fields;
  - each event triggers exactly one immediate beat;
  - on Linux, the trust latch flips at 30 s and not before;
  - the settings select persists and shows four options with 2 as the default.

  Render the Settings row (designer round).

### Slice 2 — core: the predicate and the hold (M→L)

- `desktop_presence.update` / `PresenceClaim` store the four fields and stamp `received_at`. Per
  the existing comment (`desktop_presence.py:65-69`), missing fields are dropped rather than
  retained. `read_delivery` aggregates `away_at` with max across live records and exposes
  `DesktopPresence.desk_active(now)`, `desk_known` and `last_input_at`.
- `push_worker`:
  - `_desktop_attended` becomes `desk_active`;
  - `_queue_completion` holds only if `desk_active` and `delivers(kind)`;
  - `_settle_deferred` keeps the `announced`/`attending` evidence but drops only when
    `last_input_at > surfaced_at + SEEN_GRACE_S`;
  - `_due` releases on `not desk_active`;
  - the legacy fallback (§3.3) is kept for one release.
- Config key `notifications.phone_away_after_s` with an allow-list `{60,120,300,600}`, plus the
  daemon route the phone uses to read and write it.
- Shared conformance fixture `tests/fixtures/desk_presence_cases.json` (input report, receive time,
  now → active / unknown), copied byte-identical into agent-server. A test in each repo asserts the
  copy's sha256.
- **Acceptance tests (unit, injected clock and presence):**
  - G1: at the desk in another app, a completion is held, then dropped after a banner plus input.
  - G2: focused window, idle ≥ 120 s, the item is released. A banner to an empty desk does not
    drop it.
  - G3: lock means push at once.
  - G10: desk active but `delivers(kind)` false means push now.
  - Stale report means push now.
  - A legacy report means the focus rule applies.
  - A read during the hold means drop.
  - Burst and digest still fold released items.

  QA real path: isolated HOME, serve plus daemon, a synthetic presence beat over
  `POST /v1/desktop/presence`, and the push transport stubbed to record emits.

### Slice 3 — core: TUI / no-app fallback probe (S→M)

- `local_operator/session/runtime/desk_idle.py`:
  - macOS: ctypes `CGEventSourceSecondsSinceLastEventType(kCGEventSourceStateCombinedSessionState,
    kCGAnyInputEventType)`. This is the same source Chromium uses.
  - Windows: `GetLastInputInfo`.
  - Linux: logind `IdleHint`, otherwise unknown.
- It runs **only** when no fresh desktop report exists, the core is on a local graphical session
  (not `SSH_CONNECTION`, not a session-0 service), and a TUI viewer is live. Its output is the same
  report shape, so the predicate does not change.
- **Acceptance:** per-OS unit tests with the native call faked; SSH or headless returns unknown
  (notify); TUI-only G6 is held and then dropped after a rung-3 banner plus input.

### Slice 4 — agent-server (cloud): Team Bridge hold (M)

- `PUT /v1/bridge/desk-presence` stores `{account, install_id, idle_s, locked, idle_trusted,
  away_after_s, bridge_banners, received_at}` in a TTL collection that expires after 2 ×
  `PRESENCE_TTL_S`. Only the latest row per install is kept. The desktop app sends it next to its
  Team Bridge poll, authenticated with the account session it already holds, and immediately on
  lock or resume.
- In `BridgePushJob`, before `canDeliver`:
  - if any fresh report for the recipient says `desk_active` and `bridge_banners`, **hold**. Set
    `NextAttemptAt = min(away_at, now + 30 s)` **without** incrementing `Attempts`;
  - drop if the read cursor has passed the row (today), or if seen at the desk (§3.3 rule 4);
  - release when the desk is not active.
- The existing one-hour usefulness bound (`bridge_push_job.go:93`) still applies to held rows.
  Accepted: an unread message held through more than an hour of active desk work was bannered to
  you.
- **Acceptance:** Go table tests driven by the **same fixture file**:
  - hold does not consume an attempt;
  - a stale report means immediate send;
  - multi-install: any active install holds;
  - the read cursor drops a held row.

  Sandbox real path with two synthetic installs.

### Slice 5 — local-operator-mobile (S, plus S9 dependency)

- This ADR.
- Settings → Notifications: a per-computer "Send to phone when I'm away…" row that reads and
  writes the slice-2 route. Update `docs/ux/flows.md:663`.
- Foreground handler (§3.4), **gated on S9's in-app toast**.
- **Acceptance:** Settings component tests for all four states (loading, error, set, default);
  handler tests (foreground, conversation on screen → nothing shown; other conversation → in-app
  toast, no OS banner); rendered before/after stills (design round).

**Total:** roughly 2–3 engineering days across four repositories. Slices 1 and 2 alone close G1,
G2, G3, G4, G5 and G10 for agent completions, which is the operator's main case.

## 5. Risks to watch during rollout

- **R1 — Synthetic input counts as activity.** `CombinedSessionState` includes posted events.
  Automation that posts OS-level events (cliclick, AppleScript UI scripting, a remote-desktop
  session) keeps the desk "active", so pushes are held while you are out.
  - **Watch:** daemon log lines `desk_active=true idle_s=<n>` against the operator's actual
    absence.
  - **Fix if it happens:** source `HIDSystemState` instead.
  - CDP-driven browser automation does not post OS events.
- **R2 — Linux/Wayland idle.** `getSystemIdleTime` has returned 0 under some Wayland compositors.
  The `idle_trusted` latch makes that case notify rather than hold forever.
  - **Settle it:** run a one-off on GNOME and KDE Wayland that leaves the machine untouched for
    60 s and reads the value.
- **R3 — Holding when the desktop banner was suppressed by the OS.** macOS Focus, Windows Focus
  Assist and denied permissions are invisible to `Notification.isSupported()`
  (`presence.py:157-169`). In that state a user at the desk gets neither surface until they idle
  out. This is accepted, because it is phone ≤ desktop. If it is reported, the setting is the
  lever.
- **R4 — The 15 s beat cadence.** Activity that resumes is seen up to 15 s late. A push can land
  in the first 15 s after you sit down again; this is accepted. Lock and suspend send at once, so
  leaving is never late.
- **R5 — Duplicate push on a quick lock and unlock (`LOCK_GRACE_S = 0`).**
  - **Watch:** operator reports.
  - **Fix:** raise the grace to Slack's 60 s.
- **R6 — Clock skew.** The design removes it: reports are relative (`idle_s`), and every deadline
  is computed on the receiver's own clock. A test asserts that a receiver whose clock is ±10 min
  off gives the same answer.

# Community mobile client: evidence (PR #317)

Captured 2026-11-18. The real exported web bundle (`EXPO_PUBLIC_TEAM_BRIDGE_FIXTURES=1 EXPO_PUBLIC_COMMUNITY=1 expo export --platform web`) ran in the Local Operator browser tab at 390×844, served by `tools/mock-team-bridge.ts`. Its `/mock-community/*` route passed through to a **local agent-server in `SERVER_MODE=community`** (`feat/community-dm` @ `5cd324ec`). That server used `COMMUNITY_CLASSIFIER=fake`, a fake introspection endpoint, and a local Mongo replica set and Redis. Every community answer in these frames is the real server's; the private Team Bridge rows come from the hub fixture.

| Frame | What it shows |
| --- | --- |
| 01-directory-light | "Browse communities…": featured, not joined |
| 02 / 03-join-*-light | Join sheet: guidelines 2026-11 and the agreement, unchecked (Join disabled) and then ticked |
| 04-home-light | After the real join: the 5 provisioned channels, Browse, Requests, and an empty DM section |
| 05-refused-light | `FAKE-DENY-SPAM` → 422 shown to the sender only: "Not posted: Spam or undisclosed promotion", reference `MOD-…`, draft kept |
| 06-published-light | A clean send: published, in history, draft cleared |
| 07-limited-light | Probation 429 `retry_after: 60`: countdown, Retry disabled until it ends, draft kept |
| 08-requests-dm-dark | An incoming DM request (sent by another member) with Accept / Decline / Block at 48 px. Accept here was confirmed server-side (request `accepted`, DM conversation created) |
| 09-approval-stub-dark | Content-free agent approval stub (M6): "Review on your computer" and "Don't post" |
| 10-switcher-groups-light | Amendment A: Organizations (private, with the private unread total), then a separate Communities group and "Browse communities…" |

`real-server-transcript.md` covers the client and store run directly against the same server (Node, no UI), request by request. Tokens are omitted; idempotency keys are truncated.

The left-hand JSON in each frame is the `__phone` geometry readout: viewport, root size, and each control's box.

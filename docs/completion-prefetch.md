# Completion prefetch (P1-D, first slice)

A completion received while the app is running can resolve its opaque conversation
handle on the **currently selected authenticated relay** and take one projection
into the existing warm cache. A tap overlaps the same per-session prefetch with
navigation. Neither path starts a computer route or searches other computers. A
handle that does not resolve on this relay is a 404 with no fallback.

The coordinator is pure and injected. The connection provider registers a scope
only after route admission, and unregisters it on retirement. Resolution and the
seed share a 25-second deadline. A screen's live stream supersedes any seed take;
onscreen sessions are not prefetched. Concurrent requests for a session share a
seed, and successful seeds are limited to one per session per 60 seconds. Only the
first projection is taken, and the stream closes **before** the cache save. The
existing encrypted native warm-cache adapter and private-write barrier remain in
force; the seed also rechecks ownership when its serialized cache write is admitted.
The web cache remains memory-only.

## Not background refresh

Visible iOS completion pushes **without `content-available` do not wake a
suspended app**. This slice makes no suspended-completion, native delivery, battery,
or device-performance claim. It adds no background task, mode, dependency, periodic
job, or permanent socket. The existing attention badge/banner clear is unchanged.

Attention pushes carry an opaque per-account `computer` handle but no conversation
handle. They cannot safely be matched against a saved-computer registry id or a
tunnel id. As of the contract this slice builds against:

- `POST /api/push/register` returns `ok`, `device_id`, `device_key`, and
  `registered_at`, not that computer handle;
- `GET /api/push/conversation/{handle}` returns only `session_id`;
- unknown conversation handles are refused on the selected relay, not resolved by
  switching routes.

Attention-triggered list/last-viewed warming is therefore a **separate, undelivered
slice**. Its prerequisite is an authenticated registration response exposing
`computer_handle`, sourced from the exact authority that produces push payload
`computer`, with account/route ownership and revocation tests. Only after that
contract is available can the existing notification task perform best-effort warm
refresh after clearing badges, within its same 25-second total budget. This PR
contains no always-NoData attention stub and makes no cloud-envelope or keychain
accessibility changes.

## Evidence and remaining validation

Node tests use the production endpoint, SSE, coordinator, and cache modules against
`tools/mock-relay` over loopback, injecting notification envelopes. They check the
200 resolve/seed path, first-frame stream closure, account-scoped cache contents,
404/no-fallback, 401/no-seed, and onscreen skip. Injected adapter tests additionally
cover deadline cancellation, account switch while resolving/receiving/queuing a
save, single-flight, receipt/tap dedupe, reconnect, and the successful-seed limit.
Expo received-listener tests mock the native binding; they are not native proof.

Independent QA should repeat these requests on the PR head, inject both iOS `body`
and Android `dataString` receipts, and exercise the tap resolver's one navigation
and the screen's supersession. Real foreground receipt/tap delivery on iOS/Android
remains device/CI validation. Locked cold launches must continue to make no warm
requests or credential changes.

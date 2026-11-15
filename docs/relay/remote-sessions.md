# Remote conversations through the relay

A remote row opens the ordinary `/session/{id}` screen. Viewing never recalls,
moves, copies, starts, or wakes the session. Long-press the row to open the
existing explicit move/copy sheet.

## Capability and ownership

The connected relay advertises the complete baseline in its sessions list:

```json
{
  "remote_sessions": {
    "available": true,
    "version": 1,
    "view": true,
    "history": true,
    "commands": true,
    "media": true,
    "supported_command_ops": ["prompt", "steer"],
    "document_upload": false
  }
}
```

An absent, partial, unavailable, or unknown-version capability does not mount
remote readers or a composer. Admission requires a live list frame: cached flags
from a previous daemon cannot claim that the current relay supports the routes. The screen explains that remote operation support
requires an updated relay. A pending/offline capability read is not an empty
conversation. Once admitted, the screen stays mounted through peer failures so
loaded messages and unsent drafts survive.

The phone keeps `remote=1` and the listing's owner ID as navigation metadata when
a peer disappears from later lists. **Neither is transport authority.** History,
SSE, commands, images, files, and videos use the existing authenticated,
session-ID-only relay routes. The relay resolves and pins the authorized owner
from its trusted listing and enforces view versus drive per operation. The phone
never receives an owner control key, peer URL, or arbitrary attachment path.

## Supported instructions and media

Typed prompt/steer and inline images use the existing command UUID/envelope
lifecycle unchanged. The native client does not send `expand_skills=true`.
Only the relay's recorded image/file/video references are readable. A photo
picked from Files is still an inline **image**, not a document upload.

Remote document and audio uploads are not supported. The remote composer does
not inherit the connected computer's STT capability or its audio path; both the
recording mic and the connected-computer STT setup control are omitted. Local
conversations retain their existing dictation behavior. Other unsupported
session commands are refused explicitly by the relay, never executed on the
connected computer as a fallback.

## Refusals are operation-local

The relay marks peer failures as `{error: code, code, remote: true}`:

| HTTP | Code | Native behavior |
|---|---|---|
| 503 | `remote_owner_unresolved` | Refresh the trusted session list; retain content. |
| 503 | `remote_unreachable` | Check the owner is online; retry reads. |
| 409 | `remote_unsupported` | Explain unsupported remote operation/update remedy. |
| 403 | `remote_forbidden` | Explain missing mesh permission, never phone logout. |
| 404 | `remote_session_missing` | Explain owner session is missing. |
| 409 | `remote_cursor_missing` | Retain messages; explain reopening to reset history. |
| 409 | `remote_command_ambiguous` | Keep the UUID/envelope; **no automatic replay**. |

Only known code/status pairs with the remote marker take this path. Real phone
401s keep the existing authentication behavior. A banner's retry reopens reads;
it does not resend an ambiguous instruction. The composer retains the existing
explicit same-UUID retry controls.

`remote-session-contract.test.ts` exercises actual loopback requests from the
native relay client to a synthetic admitted relay with two owner session IDs.
It is a client contract proof, not evidence that a real mesh peer authorized the
request. Core's independent two-peer QA supplies the mesh proof.

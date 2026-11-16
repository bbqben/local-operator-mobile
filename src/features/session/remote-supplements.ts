import type { Capabilities } from "@/contracts";

/** Older relays can show remote transcripts/attachments but cannot owner-route
 * Highlights. Require the explicit supplement read contract, never mesh presence
 * or command support. The owner negotiates mobile-session-supplements-v1 on the
 * server; the phone still uses its admitted relay's ordinary document/file/sound
 * URLs, with no peer host, cwd or path supplied by this client.
 */
export function sessionSupplementsAvailable(
	capabilities: Capabilities | null | undefined,
	remote: boolean,
): boolean {
	if (!remote) return true;
	const support = capabilities?.remote_sessions;
	return (
		support?.supplements === true &&
		["document", "file", "sound"].every((kind) =>
			support.supplement_kinds?.includes(kind),
		)
	);
}

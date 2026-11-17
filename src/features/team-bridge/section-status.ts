import type { OrgData } from "@/team-bridge/store";

/**
 * What the directory list shows for each half of an organization (channels and
 * groups, people), derived from the store's `OrgData` alone.
 *
 * WHY A MODULE OF ITS OWN. `list-screen.tsx` pulls in React Native, which a
 * Node test cannot load, and these four conditions are exactly where a 429 used
 * to surface as the operator's red "HTTP 429" banner (TestFlight 1157). Keeping
 * them pure lets `rate-limit.test.ts` drive the REAL store through refusals and
 * assert what the list would render, rather than re-deriving the conditions in
 * the test.
 *
 * - `skeleton`: nothing held yet and the half is still being read, INCLUDING a
 *   cold wait that has turned into "Catching up…". The skeleton stays so the
 *   Groups heading keeps waiting for data (UX U1-5, design D2).
 * - `catchingUp`: the trailing status in that half's heading (design D1). It
 *   never accompanies `alert`; a non-429 failure clears it in the store.
 * - `alert`: the red error with its Retry button, for non-429 failures only.
 */
export interface SectionStatus {
	skeleton: boolean;
	catchingUp: boolean;
	alert: boolean;
}

export function conversationsStatus(org: OrgData | undefined): SectionStatus {
	return {
		skeleton:
			(!org ||
				org.conversationsState === "idle" ||
				org.conversationsState === "loading") &&
			!org?.conversations.length,
		catchingUp: org?.conversationsCatchingUp === true,
		alert: org?.conversationsState === "error",
	};
}

export function peopleStatus(org: OrgData | undefined): SectionStatus {
	return {
		skeleton: org?.peopleState === "loading" && !org.people.length,
		catchingUp: org?.peopleCatchingUp === true,
		alert: org?.peopleState === "error",
	};
}

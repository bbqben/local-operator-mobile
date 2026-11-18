/**
 * The community store's lifetime: one per Radient account, beside (never
 * inside) the private Team Bridge store.
 *
 * WHY A SEPARATE PROVIDER. RFC v2.4 §7.2: the community client "shares no state
 * with the private Bridge client or receiver". What the two DO share is the
 * connection layer's single-flight OAuth accessor — one credential, one refresh
 * lifecycle — and the same owner check the Team Bridge provider applies: a token
 * that belongs to a different account than the one this store was built for is
 * never presented (a sign-in switch mid-request must not post as the new
 * account under the old account's screen state).
 *
 * The flag (`communityEnabled`) does not gate the provider: it costs nothing
 * until a screen reads it, and a member whose build later turns the flag off
 * can still reach (and leave) what they joined through the switcher.
 */
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useStore } from "zustand";
import { createCommunityClient } from "@/community/client";
import {
	type CommunityState,
	type CommunityStore,
	createCommunityStore,
} from "@/community/store";
import { accountIdFromToken } from "@/connection/radient-identity";
import { useConnection } from "@/features/auth/connection-provider";
import { communityFixture } from "@/testing/community-fixture";

const Context = createContext<CommunityStore | null>(null);

export function CommunityProvider({ children }: { children: ReactNode }) {
	const connection = useConnection();
	const access = useRef(connection.radientAccessToken);
	access.current = connection.radientAccessToken;
	const fixture = useMemo(() => communityFixture(), []);
	const value = useMemo(() => {
		const owner = connection.radientAccountId;
		let active = true;
		const accessToken = async (options?: {
			force?: boolean;
		}): Promise<string | null> => {
			if (!active) return null;
			if (fixture) return fixture.token;
			const token = await access.current(options);
			return active && owner && accountIdFromToken(token) === owner
				? token
				: null;
		};
		const client = createCommunityClient({
			accessToken,
			...(fixture ? { baseUrl: fixture.baseUrl } : {}),
		});
		const scope = createCommunityStore({
			client: () => (active ? client : null),
		});
		return {
			...scope,
			retire() {
				active = false;
				scope.actions.close();
			},
		};
	}, [fixture, connection.radientAccountId]);
	/* A replaced account retires the old store in the same commit: its loops
	 * stop and its in-memory drafts and outcomes are dropped. */
	useEffect(() => () => value.retire(), [value]);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCommunity(): CommunityStore {
	const value = useContext(Context);
	if (!value) throw new Error("useCommunity outside CommunityProvider");
	return value;
}

export function useCommunityState<T>(
	selector: (state: CommunityState) => T,
): T {
	return useStore(useCommunity().store, selector);
}

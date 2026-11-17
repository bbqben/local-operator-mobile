/**
 * The avatar fan-out that drained the account's `reads` bucket (TestFlight
 * 1157, 2026-11-17, hub logs 20:30–20:41Z): one drawer open sent 119
 * `GET /v1/messaging/endpoints/bep_*` + `/avatar` → 304 in a single burst,
 * and the directory and settings reads after it got 429.
 *
 * "A drawer open" here is what the mounted rows do: every visible agent row's
 * `useEndpointAvatarUri` calls `cache.loadEndpoint` with a reader that goes
 * through the REAL hub client (`endpointAvatarBytes`), so the counted unit is
 * an HTTP request reaching `fetch`, not a mock call.
 */
import { describe, expect, it } from "vitest";
import {
	AVATAR_VIEWPORT_MARGIN,
	createViewportSignal,
	inAvatarViewport,
} from "@/features/team-bridge/avatar-viewport";
import {
	AVATAR_MAX_IN_FLIGHT,
	createAvatarCache,
	endpointAvatarFailure,
	endpointAvatarKey,
} from "@/team-bridge/avatars";
import { createHubClient } from "@/team-bridge/client";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const ENDPOINTS = Array.from(
	{ length: 120 },
	(_, i) => `bep_${String(i).padStart(3, "0")}`,
);
const HASH = "0123456789abcdef";

function rig() {
	let requests = 0;
	let open = 0;
	let peak = 0;
	const hub = createHubClient({
		accessToken: async () => ["unit", "photo"].join("-"),
		fetchImpl: (async (url: string) => {
			if (!String(url).includes("/avatar"))
				throw new Error(`unexpected ${url}`);
			requests += 1;
			open += 1;
			peak = Math.max(peak, open);
			await new Promise((resolve) => setTimeout(resolve, 1));
			open -= 1;
			return new Response(PNG, { headers: { "content-type": "image/png" } });
		}) as unknown as typeof fetch,
	});
	const cache = createAvatarCache();
	/** One drawer open: every agent row mounts and asks for its 64 px photo
	 *  (or, with `visible`, only the rows the viewport gate lets through). */
	const drawerOpen = (
		hashOf: (endpoint: string) => string = () => HASH,
		visible: (index: number) => boolean = () => true,
	) =>
		Promise.all(
			ENDPOINTS.filter((_, index) => visible(index)).map((endpoint) =>
				cache.loadEndpoint(
					endpointAvatarKey(endpoint, hashOf(endpoint), 64),
					async () => {
						const { bytes } = await hub.endpointAvatarBytes(
							endpoint,
							hashOf(endpoint),
							64,
						);
						return `data:image/png;base64,${bytes.length}`;
					},
					endpointAvatarFailure,
				),
			),
		);
	return {
		cache,
		drawerOpen,
		count: () => requests,
		peak: () => peak,
	};
}

describe("endpoint avatar requests per drawer open (120 agents)", () => {
	it("first open reads each photo once, never more than 4 at a time", async () => {
		const { drawerOpen, count, peak } = rig();
		const uris = await drawerOpen();
		expect(uris.every((uri) => uri !== null)).toBe(true);
		expect(count()).toBe(120);
		expect(peak()).toBeLessThanOrEqual(AVATAR_MAX_IN_FLIGHT);
		expect(AVATAR_MAX_IN_FLIGHT).toBe(4);
	});

	it("a re-open with unchanged hashes sends 0 requests (was 120)", async () => {
		const { drawerOpen, count } = rig();
		await drawerOpen();
		const afterFirst = count();
		const uris = await drawerOpen();
		expect(count() - afterFirst).toBe(0);
		expect(uris.every((uri) => uri !== null)).toBe(true);
	});

	it("a new hash is a new photo: only that one is read", async () => {
		const { drawerOpen, count } = rig();
		await drawerOpen();
		const afterFirst = count();
		await drawerOpen((endpoint) =>
			endpoint === "bep_007" ? "fedcba9876543210" : HASH,
		);
		expect(count() - afterFirst).toBe(1);
	});

	it("sign-out / account change clears the held photos", async () => {
		const { cache, drawerOpen, count } = rig();
		await drawerOpen();
		cache.clear();
		await drawerOpen();
		expect(count()).toBe(240);
	});
});

/*
 * The drawer's rows are 48 pt tall (`TOUCH_FLOOR`) in a ScrollView that mounts
 * all of them; an iPhone window is ~850 pt. The gate admits rows whose box
 * touches the window plus `AVATAR_VIEWPORT_MARGIN` above and below.
 */
const ROW = 48;
const WINDOW = 852;
const HEADER = 300; // org switcher, conversations and the People heading
const rowBox = (index: number, scrollY = 0) => ({
	y: HEADER + index * ROW - scrollY,
	width: 48,
	height: ROW,
});

describe("only on-screen rows read their photo", () => {
	it("an unlaid-out box (measureInWindow zeros) is not seen", () => {
		expect(inAvatarViewport({ y: 0, width: 0, height: 0 }, WINDOW)).toBe(false);
	});

	it("first open of a 120-agent drawer reads the visible band, not 120", async () => {
		const { drawerOpen, count } = rig();
		const visible = (index: number) => inAvatarViewport(rowBox(index), WINDOW);
		await drawerOpen(undefined, visible);
		const expected = Math.ceil(
			(WINDOW + AVATAR_VIEWPORT_MARGIN - HEADER) / ROW,
		);
		expect(count()).toBe(expected);
		expect(count()).toBeLessThan(20);
	});

	it("scrolling reads the newly revealed rows once; scrolling back reads nothing", async () => {
		const { drawerOpen, count } = rig();
		const seen = new Set<number>();
		const signal = createViewportSignal();
		let scrollY = 0;
		// Each mounted row re-measures on the list's signal and latches "seen".
		for (let index = 0; index < ENDPOINTS.length; index += 1)
			signal.subscribe(() => {
				if (inAvatarViewport(rowBox(index, scrollY), WINDOW)) seen.add(index);
			});
		signal.emit();
		await drawerOpen(undefined, (index) => seen.has(index));
		const first = count();
		scrollY = 1_000;
		signal.emit();
		await drawerOpen(undefined, (index) => seen.has(index));
		const afterScroll = count();
		expect(afterScroll - first).toBe(Math.ceil(1_000 / ROW));
		scrollY = 0;
		signal.emit();
		await drawerOpen(undefined, (index) => seen.has(index));
		expect(count()).toBe(afterScroll);
	});
});

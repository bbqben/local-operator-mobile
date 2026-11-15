import { createServer } from "node:http";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	DEFAULT_NOTIFICATION_PREFERENCES,
	type NotificationPreferences,
	teamBridgeWanted,
	wirePreferences,
} from "@/notifications/notification-preferences";
import { createHubClient } from "@/team-bridge/client";
import {
	registerTeamBridgeDevice,
	unregisterTeamBridgeDevice,
} from "@/team-bridge/push";
import { createPushLifecycle } from "@/team-bridge/push-lifecycle";
import { createTeamBridgeStore } from "@/team-bridge/store";
import { conversation, TENANT } from "./fixtures";

const native = vi.hoisted(() => ({ platform: "ios", generation: 0 }));
vi.mock("react-native", () => ({
	Platform: {
		get OS() {
			return native.platform;
		},
	},
}));
vi.mock("expo-constants", () => ({
	default: { expoConfig: { version: "0.0.0" } },
}));
vi.mock("@/notifications/native", () => ({
	notificationsSupported: () => true,
	loadNotifications: async () => ({
		getPermissionsAsync: async () => ({ status: "granted" }),
		getDevicePushTokenAsync: async () => ({
			type: native.platform,
			data: "synthetic-device-token",
		}),
	}),
}));
vi.mock("@/notifications/install-id", () => ({
	ensureInstallRecord: async () => ({ v: 1, install_id: "synthetic-install" }),
	nextBridgePushGeneration: async () => ++native.generation,
}));

/** This socket fixture is a contract boundary, NOT evidence of the hub's push
 * sender. It records real module-built mutations, acknowledges read policies,
 * and refuses synthetic bad accounts without touching any external service. */
const requests: {
	method: string;
	path: string;
	account: string;
	body: Record<string, unknown>;
	status: number;
}[] = [];
const devices = new Map<string, Record<string, unknown>>();
let origin = "";
const server = createServer(async (req, res) => {
	let text = "";
	for await (const chunk of req) text += chunk;
	const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
	const account = req.headers.authorization?.replace("Bearer ", "") ?? "";
	const path = new URL(req.url ?? "/", "http://fixture.invalid").pathname;
	const method = req.method ?? "GET";
	const status =
		account === "denied" ? 401 : body.tenant_id === "wrong-tenant" ? 403 : 200;
	requests.push({ method, path, account, body, status });
	res.setHeader("content-type", "application/json");
	if (status !== 200) {
		res.writeHead(status).end(JSON.stringify({ error: "Synthetic refusal" }));
		return;
	}
	if (path.endsWith("/push/devices") && method === "PUT") {
		devices.set(account, body);
		res.end(
			JSON.stringify({
				msg: "ok",
				result: { device_id: "synthetic-device", platform: body.platform },
			}),
		);
	} else if (
		path.endsWith("/push/devices/synthetic-install") &&
		method === "DELETE"
	) {
		devices.delete(account);
		res.end(JSON.stringify({ msg: "ok", result: {} }));
	} else if (path.endsWith("/read")) {
		res.end(
			JSON.stringify({
				msg: "ok",
				result: {
					conversation_id: path.split("/").at(-2),
					last_read_seq: 0,
					unread_count: 0,
					muted: body.notify === "mute",
					notify: body.notify,
				},
			}),
		);
	} else if (path.endsWith("/unread")) {
		res.end(
			JSON.stringify({ msg: "ok", result: { total: 0, organizations: [] } }),
		);
	} else {
		res
			.writeHead(404)
			.end(JSON.stringify({ error: "Unknown synthetic route" }));
	}
});
beforeAll(async () => {
	vi.stubGlobal("__DEV__", false);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("No fixture listener");
	origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	vi.unstubAllGlobals();
});
beforeEach(() => {
	requests.length = 0;
	devices.clear();
	native.generation = 0;
});
const hubFor = (account: string) =>
	createHubClient({ baseUrl: origin, accessToken: async () => account });

describe.each(["ios", "android"])(
	"independent %s Bridge registration over a real socket",
	(platform) => {
		it("keeps agent-off Bridge-on registered; master/Bridge off DELETE and reconnect cannot PUT", async () => {
			native.platform = platform;
			let prefs: NotificationPreferences = {
				...DEFAULT_NOTIFICATION_PREFERENCES,
				completions: false,
				errors: false,
			};
			const hub = hubFor("account-a");
			const lifecycle = createPushLifecycle({
				register: async (isCurrent) => {
					if (teamBridgeWanted(prefs))
						expect(await registerTeamBridgeDevice(hub, isCurrent)).toBe(
							"registered",
						);
				},
				unregister: () => unregisterTeamBridgeDevice(hub),
			});
			lifecycle.activate();
			await lifecycle.register();
			expect(devices.get("account-a")).toMatchObject({
				platform,
				token: "synthetic-device-token",
				install_id: "synthetic-install",
				generation: 1,
			});
			expect(
				wirePreferences(prefs, { preferences: true, previews: false }),
			).toEqual({ enabled: true, completions: false, errors: false });
			for (const off of [{ teamBridge: false }, { enabled: false }]) {
				prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...off };
				await lifecycle.withdraw();
				expect(devices.has("account-a")).toBe(false);
				const afterDelete = requests.length;
				await lifecycle.register(); // foreground/reconnect while still off
				expect(requests).toHaveLength(afterDelete);
				expect(requests.at(-1)).toMatchObject({
					method: "DELETE",
					status: 200,
				});
				prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
				await lifecycle.register();
				expect(devices.has("account-a")).toBe(true);
			}
			await lifecycle.retire();
			const b = hubFor("account-b");
			// Recreate the lifecycle with the same phone preference supplied to a
			// replacement account. Storage round trips are covered by preference tests.
			prefs = { ...prefs, teamBridge: false };
			const replacement = createPushLifecycle({
				register: async (isCurrent) => {
					if (teamBridgeWanted(prefs))
						await registerTeamBridgeDevice(b, isCurrent);
				},
				unregister: () => unregisterTeamBridgeDevice(b),
			});
			replacement.activate();
			const retired = requests.length;
			await replacement.register();
			expect(requests).toHaveLength(retired);
			expect(devices.size).toBe(0);
			prefs = { ...prefs, teamBridge: true };
			await replacement.register();
			expect([...devices.keys()]).toEqual(["account-b"]);
			await replacement.retire();
			expect(requests.every((row) => row.status === 200)).toBe(true);
		});
	},
);

describe("per-conversation policy writes over the real hub client and store", () => {
	it.each(["bcv_dm", "bcv_group", "bcv_channel"])(
		"sends and applies all/mention/mute only for %s",
		async (id) => {
			const hub = hubFor("account-a");
			const { store, actions } = createTeamBridgeStore({
				hub: () => hub,
				accessToken: async () => "account-a",
			});
			store.setState({ gate: "open" });
			actions.adopt(conversation({ id }));
			for (const notify of ["all", "mention", "mute"] as const) {
				const reads = store.getState().unreadReads;
				await actions.setNotify(TENANT, id, notify);
				// setNotify intentionally refreshes the badge in the background;
				// drain that real request before this fixture's next isolated row.
				await vi.waitFor(() =>
					expect(store.getState().unreadReads).toBe(reads + 1),
				);
				const sent = requests.findLast((row) => row.path.endsWith("/read"));
				expect(sent).toEqual({
					method: "POST",
					path: `/v1/messaging/conversations/${id}/read`,
					account: "account-a",
					body: { tenant_id: TENANT, notify },
					status: 200,
				});
				expect(
					store
						.getState()
						.orgs[TENANT]?.conversations.find((row) => row.id === id)?.notify,
				).toBe(notify);
			}
		},
	);
	it("auth and wrong-tenant refusals remain typed failures", async () => {
		const denied = hubFor("denied");
		await expect(
			denied.markRead(TENANT, "bcv_dm", { notify: "mute" }),
		).rejects.toMatchObject({ kind: "sign_in" });
		await expect(
			hubFor("account-a").markRead("wrong-tenant", "bcv_dm", {
				notify: "mute",
			}),
		).rejects.toMatchObject({ kind: "refused" });
		expect(requests.map((row) => row.status)).toEqual([401, 401, 403]);
	});
});

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import {
	notificationPreferencesStore,
	resetNotificationPreferences,
} from "@/notifications/notification-preferences";
import { type DomShim, installDomShim } from "@/testing/dom-shim";
import { CONTROL } from "@/ui/a11y";

const host = vi.hoisted(() => ({
	signedIn: true,
	fixture: false,
	relay: () => null,
	withdraw: vi.fn(async () => {}),
	register: vi.fn(async () => {}),
	sessionRegister: vi.fn(),
	rows: new Map<string, { value: boolean; change: (value: boolean) => void }>(),
}));
vi.mock("react-native", () => ({
	Platform: { OS: "web" },
	Linking: {},
	View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
	Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/connection/storage", async (original) => {
	const actual = await original<typeof import("@/connection/storage")>();
	const storage = actual.memorySecureStore();
	return { ...actual, expoSecureStore: async () => storage };
});
vi.mock("@/features/auth/connection-provider", () => ({
	useConnection: () => ({
		radientSignedIn: host.signedIn,
		relay: host.relay,
	}),
	useConnectionState: (select: (s: object) => unknown) =>
		select({ route: null }),
	useListState: (select: (s: object) => unknown) =>
		select({ lastFrameAt: null }),
}));
vi.mock("@/notifications/native", () => ({
	readAvailability: async () => "granted",
	requestPermission: async () => "granted",
}));
vi.mock("@/notifications/use-session-push-registration", () => ({
	requestSessionPushRegistration: () => host.sessionRegister(),
}));
vi.mock("@/team-bridge/provider", () => ({
	useTeamBridge: () => ({
		registerPush: host.register,
		withdrawPush: host.withdraw,
	}),
}));
vi.mock("@/testing/team-bridge-fixture", () => ({
	teamBridgeFixture: () => (host.fixture ? { token: "synthetic" } : null),
}));
vi.mock("@/features/sessions/sidebar-view-controls", () => ({
	SwitchRow: ({
		label,
		value,
		onChange,
		testID,
	}: {
		label: string;
		value: boolean;
		onChange: (value: boolean) => void;
		testID: string;
	}) => {
		host.rows.set(testID, { value, change: onChange });
		return <span>{label}</span>;
	},
}));
vi.mock("@/ui/components/section-header", () => ({
	SectionHeader: ({ label }: { label: string }) => <h2>{label}</h2>,
}));
vi.mock("@/ui/components/button", () => ({ Button: () => null }));

import { NotificationsSection } from "./notifications-section";

let dom: DomShim;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
	dom = installDomShim();
	root = createRoot(dom.container as unknown as HTMLElement);
	host.signedIn = true;
	host.fixture = false;
	host.rows.clear();
	vi.clearAllMocks();
	resetNotificationPreferences();
});
afterEach(async () => {
	await act(async () => root.unmount());
	dom.dispose();
});
const render = () => act(async () => root.render(<NotificationsSection />));
const textOf = (node: Node): string => {
	const children = Array.from(node.childNodes ?? []);
	return children.length
		? children.map(textOf).join(" ")
		: (node.textContent ?? "");
};
const toggle = (id: string, value: boolean) =>
	act(async () => {
		const row = host.rows.get(id);
		if (!row) throw new Error(`Missing switch ${id}`);
		row.change(value);
	});

describe("notification settings grouping and independent switches", () => {
	it("renders the global gate before separate Agent and Team Bridge sections", async () => {
		await render();
		const text = textOf(dom.container as unknown as Node);
		expect(
			text.indexOf(t("mobile.notifications.preferences.master")),
		).toBeLessThan(
			text.indexOf(t("mobile.notifications.preferences.agent_heading")),
		);
		expect(
			text.indexOf(t("mobile.notifications.preferences.agent_heading")),
		).toBeLessThan(
			text.indexOf(t("mobile.notifications.preferences.bridge_heading")),
		);
		expect(text).toContain(t("mobile.notifications.preferences.agent_note"));
		expect(text).toContain(
			t("mobile.notifications.preferences.bridge_note", {
				all: t("mobile.team_bridge.thread.notify_all"),
				mentions: t("mobile.team_bridge.thread.notify_mentions"),
				muted: t("mobile.team_bridge.thread.notify_mute"),
			}),
		);
	});
	it("turns both agent types off without withdrawing Bridge, and Bridge off without changing agent choices", async () => {
		await render();
		await toggle(CONTROL.settingsNotificationsCompletions, false);
		await toggle(CONTROL.settingsNotificationsErrors, false);
		expect(notificationPreferencesStore.getState().preferences).toMatchObject({
			enabled: true,
			completions: false,
			errors: false,
			teamBridge: true,
		});
		expect(host.withdraw).not.toHaveBeenCalled();
		await toggle(CONTROL.settingsNotificationsCompletions, true);
		await toggle(CONTROL.settingsNotificationsTeamBridge, false);
		expect(notificationPreferencesStore.getState().preferences).toMatchObject({
			enabled: true,
			completions: true,
			errors: false,
			teamBridge: false,
		});
		expect(host.withdraw).toHaveBeenCalledOnce();
	});
	it("master off withdraws Bridge and hides its children without resetting their choices", async () => {
		await render();
		await toggle(CONTROL.settingsNotificationsErrors, false);
		await toggle(CONTROL.settingsNotificationsMaster, false);
		expect(host.withdraw).toHaveBeenCalledOnce();
		expect(notificationPreferencesStore.getState().preferences.errors).toBe(
			false,
		);
		await toggle(CONTROL.settingsNotificationsMaster, true);
		expect(host.register).toHaveBeenCalledOnce();
		expect(host.rows.get(CONTROL.settingsNotificationsErrors)?.value).toBe(
			false,
		);
	});
	it("does not show Bridge settings signed out, except in the existing opted-in synthetic fixture", async () => {
		host.signedIn = false;
		await render();
		expect(host.rows.has(CONTROL.settingsNotificationsTeamBridge)).toBe(false);
		host.fixture = true;
		await render();
		expect(host.rows.has(CONTROL.settingsNotificationsTeamBridge)).toBe(true);
	});
});

/** Native-binding contract with an injected Expo module, NOT device delivery proof. */
import { afterEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({
	received: null as ((notification: unknown) => void) | null,
	remove: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-notifications", () => ({
	addNotificationReceivedListener: (
		listener: (notification: unknown) => void,
	) => {
		seam.received = listener;
		return { remove: seam.remove };
	},
}));

import { subscribeConversationPushesReceived } from "./native";

afterEach(() => {
	seam.received = null;
	vi.clearAllMocks();
});
describe("completion receipt subscription", () => {
	it("parses iOS body and Android dataString envelopes, ignores malformed/attention/digest", async () => {
		const onPush = vi.fn();
		const stop = await subscribeConversationPushesReceived(onPush);
		const completion = {
			v: 1,
			type: "completion",
			computer: "opaque-computer",
			conversation: "opaque-conversation",
		};
		const send = (data: unknown) =>
			seam.received?.({ request: { content: { data } } });
		send({ body: completion });
		send({ dataString: JSON.stringify(completion) });
		send({ v: 1, type: "attention", computer: "opaque-computer", count: 0 });
		send({ v: 1, type: "digest", computer: "opaque-computer" });
		send("not JSON");
		expect(onPush.mock.calls).toEqual([
			[{ computer: "opaque-computer", conversation: "opaque-conversation" }],
			[{ computer: "opaque-computer", conversation: "opaque-conversation" }],
		]);
		stop();
		expect(seam.remove).toHaveBeenCalledTimes(1);
	});
});

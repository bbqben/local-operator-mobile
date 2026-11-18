import { describe, expect, it } from "vitest";
import { relayErrorFromResponse } from "./errors";
import {
	createRefusalGrace,
	isSilentGatewayWait,
	RECENTLY_HEALTHY_MS,
	rearmableOnWake,
	SUSTAINED_REFUSAL_MS,
} from "./refusal-grace";

/** A gateway 503 exactly as the Mac serves it (`gateway.py` `unavailable_body`). */
const gateway503 = (
	reason: string,
	kind: string | undefined,
	retryAfter?: string,
) => {
	const body: Record<string, string> = {
		detail: "copy written for a phone",
		reason,
		error: "tunnel authorization unavailable",
	};
	if (kind !== undefined) body.kind = kind;
	return relayErrorFromResponse({
		status: 503,
		text: JSON.stringify(body),
		header: (name: string) =>
			name.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null,
	});
};

/* The 0.106.6 Mac's answer in the field report: reason + `sign_in` kind. */
const legacyRefused = () => gateway503("authorization_refused", "sign_in");

describe("the new transient reason", () => {
	it("is a silent retry that honours Retry-After (new app, new Mac)", () => {
		const error = gateway503("authorization_unavailable", "wait_radient", "40");
		expect(error.surface).toBe("retry");
		expect(error.retry).toBe("after-backoff");
		expect(error.retryAfterMs).toBe(40_000);
	});

	it("is a retry for an app that does not know the reason (old app, new Mac)", () => {
		/* Feature detection on `kind`: the reason is unknown to such a build, and
		 * `wait_radient` alone puts it on the retry surface. Exercised here by an
		 * unknown reason so the test keeps proving the old-app path after this
		 * build learns the new one. */
		const error = gateway503("authorization_from_the_future", "wait_radient");
		expect(error.surface).toBe("retry");
		expect(error.retry).toBe("after-backoff");
	});
});

describe("legacy authorization_refused (new app, old Mac)", () => {
	it("is still terminal on its own", () => {
		const error = legacyRefused();
		expect(error.surface).toBe("console");
		expect(error.retry).toBe("never");
	});

	it("is retried silently on a recently healthy route, then surfaced after 2 minutes", () => {
		const grace = createRefusalGrace();
		const t0 = 1_000_000;
		grace.healthy(t0);
		const first = grace.decide(legacyRefused(), t0 + 30_000);
		expect(first.surface).toBe("retry");
		expect(first.retry).toBe("after-backoff");
		expect(first.reason).toBe("authorization_refused");
		expect(grace.softening()).toBe(true);
		const later = grace.decide(
			legacyRefused(),
			t0 + 30_000 + SUSTAINED_REFUSAL_MS - 1,
		);
		expect(later.surface).toBe("retry");
		const sustained = grace.decide(
			legacyRefused(),
			t0 + 30_000 + SUSTAINED_REFUSAL_MS,
		);
		expect(sustained.surface).toBe("console");
		expect(grace.softening()).toBe(false);
	});

	it("restarts the 2-minute window after the route serves again", () => {
		const grace = createRefusalGrace();
		grace.healthy(0);
		grace.decide(legacyRefused(), 10_000);
		grace.healthy(100_000);
		expect(
			grace.decide(legacyRefused(), 100_000 + SUSTAINED_REFUSAL_MS - 1).surface,
		).toBe("retry");
	});

	it("is not softened on a route that never served", () => {
		const grace = createRefusalGrace();
		expect(grace.decide(legacyRefused(), 5_000).surface).toBe("console");
	});

	it("is not softened when the last frame is older than the Mac's own grace", () => {
		const grace = createRefusalGrace();
		grace.healthy(0);
		expect(grace.decide(legacyRefused(), RECENTLY_HEALTHY_MS + 1).surface).toBe(
			"console",
		);
	});

	it("never softens a refusal that is not ambiguous", () => {
		const grace = createRefusalGrace();
		grace.healthy(0);
		for (const [reason, kind] of [
			["tunnel_not_authorized", "open_console"],
			["login_required", "sign_in"],
			["billing_lapsed", "add_credit"],
		] as const)
			expect(grace.decide(gateway503(reason, kind), 1_000).surface).toBe(
				"console",
			);
	});
});

describe("rearmableOnWake", () => {
	it("re-arms a gateway refusal, never phone authentication", () => {
		expect(rearmableOnWake(legacyRefused())).toBe(true);
		const unauthorized = relayErrorFromResponse({
			status: 401,
			text: '{"error":"authentication required"}',
			header: () => null,
		});
		expect(rearmableOnWake(unauthorized)).toBe(false);
		expect(rearmableOnWake(null)).toBe(false);
	});
});

describe("isSilentGatewayWait (the conversation reconnects instead of blocking)", () => {
	it("is true for the new reason and a softened legacy refusal only", () => {
		const grace = createRefusalGrace();
		grace.healthy(0);
		expect(
			isSilentGatewayWait(
				gateway503("authorization_unavailable", "wait_radient"),
			),
		).toBe(true);
		expect(isSilentGatewayWait(grace.decide(legacyRefused(), 1_000))).toBe(
			true,
		);
		expect(isSilentGatewayWait(legacyRefused())).toBe(false);
		/* A wait whose sentence the reader should see stays a block. */
		expect(
			isSilentGatewayWait(gateway503("authorization_deferred", "wait_radient")),
		).toBe(false);
	});
});

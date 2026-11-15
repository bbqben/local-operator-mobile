/** The account-routing ENGLISH SOURCE table — an oracle, not the UI's renderer.
 *
 * WHO READS IT. Two consumers, neither of them a screen:
 *  - `scripts/ci/account-routing-ios-proof.ts` / `account-routing-proof-flows.ts`
 *    drive the app in English and match visible text against `.source`; and
 *  - `catalogues.test.ts` asserts this table equals the English catalogue
 *    (`src/i18n/catalogues/en/mobile.account_routing.json`) key for key, so the
 *    oracle cannot drift from what an English reader sees.
 * The Settings section (`account-routing-section.tsx`) renders the SAME keys
 * through `t()` from `@/i18n`, i.e. the active locale's catalogue. It used to
 * call `accountRoutingCopy()` here, which showed every locale English (M3 S5);
 * `account-routing-section.test.tsx` now renders it in ur/fr and fails on any
 * English source string. Do not import this module from UI code.
 *
 * WHY IT STAYS DEPENDENCY-FREE (NO `t()`, NO `@/i18n`). The proof entries are
 * plain-`node` scripts (the iOS proof's command is pinned by
 * `account-routing-proof.test.ts`) that statically import this module. Node's ESM
 * resolver cannot follow the extensionless relative imports `src/` is written
 * with (bundler resolution), so any import added here breaks those entries
 * before a single line runs. `copy-resolution.test.ts` pins it as English on
 * purpose for the same reason.
 *
 * These are OUR chrome keys, not a claim to consume core wire descriptors:
 * account-routing-v1 sends label/help/choice/error TEXT only, and those values
 * remain backend-owned. No policy choices, defaults or routing decisions belong
 * in this table. `context` and `role` mirror the translator notes.
 */
export const ACCOUNT_ROUTING_SOURCE_LOCALE = "en" as const;
export const ACCOUNT_ROUTING_COPY = {
	"mobile.account_routing.title": {
		source: "Account routing",
		context:
			"Section heading in computer settings; not a provider/model picker.",
		role: "heading",
	},
	"mobile.account_routing.scope": {
		source: "Changes apply only to this computer.",
		context:
			"Scope note below the selected computer; never imply a phone-global routing policy.",
		role: "help",
	},
	"mobile.account_routing.disconnected": {
		source: "Connect to a computer to change account routing.",
		context:
			"No usable selected-route client; do not call the relay outdated or claim an empty policy.",
		role: "status",
	},
	"mobile.account_routing.loading": {
		source: "Loading account routing…",
		context:
			"Read in flight; no policy choice is asserted before the backend answers.",
		role: "status",
	},
	"mobile.account_routing.save": {
		source: "Save policy",
		context:
			"Explicitly saves this temporary draft to the selected computer only.",
		role: "button",
	},
	"mobile.account_routing.saving": {
		source: "Saving…",
		context: "Write pending; never a saved confirmation.",
		role: "button",
	},
	"mobile.account_routing.saved": {
		source: "Saved on this computer.",
		context:
			"Only after a validated response confirms the requested value on the same route.",
		role: "status",
	},
	"mobile.account_routing.unsaved": {
		source: "Not saved yet.",
		context:
			"A selected draft differs from the backend value; changing radio alone does not persist.",
		role: "status",
	},
	"mobile.account_routing.retry": {
		source: "Try again",
		context:
			"Retry a failed read; not a blind automatic retry of an uncertain save.",
		role: "button",
	},
	"mobile.account_routing.reload": {
		source: "Reload policy",
		context:
			"After an uncertain or rejected save: GET the computer's committed policy and replace the draft; never repeat the write blindly.",
		role: "button",
	},
	"mobile.account_routing.unavailable": {
		source:
			"Account routing settings are unavailable on this relay. Update Local Operator on this computer.",
		context:
			"Confirmed missing relay route only; never use for an offline/unknown tunnel.",
		role: "status",
	},
	"mobile.account_routing.load_error": {
		source:
			"Could not load account routing. Check the connection and try again.",
		context:
			"Read failed for another reason, distinct from a confirmed old relay.",
		role: "status",
	},
	"mobile.account_routing.error": {
		source:
			"The change could not be confirmed. Check the connection and reload to read the current policy.",
		context:
			"Unknown save outcome or mismatched confirmation; do not assert not-saved or success.",
		role: "status",
	},
	"mobile.account_routing.rejected": {
		source:
			"The change was not saved. Check the value or this computer’s settings and try again.",
		context:
			"Definitive backend refusal; preserve any backend error text separately, not as a descriptor.",
		role: "status",
	},
} as const;

export type AccountRoutingCopyKey = keyof typeof ACCOUNT_ROUTING_COPY;
export function accountRoutingCopy(key: AccountRoutingCopyKey): string {
	// A missing technical key is a development error, not text to leak into a UI
	// or a reason to silently invent an untracked English literal at the call site.
	if (!Object.hasOwn(ACCOUNT_ROUTING_COPY, key)) {
		throw new RangeError(`Missing account-routing source key: ${key}`);
	}
	return ACCOUNT_ROUTING_COPY[key].source;
}

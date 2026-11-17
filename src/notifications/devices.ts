/**
 * The device-list vocabulary: the core's five device states, in the app's language.
 *
 * `push_devices.STATE_DESCRIPTIONS` (local-operator, `mobile/push_devices.py`) is
 * the product's own sentence for each state, and the core keeps it in ENGLISH
 * for its CLI legend. This app no longer mirrors that table verbatim: Settings
 * renders in the reader's language (design review D2, PR #287), so each state is
 * a catalogue key (`mobile.notifications.device_state.<state>`) translated in
 * all shipped locales. The English catalogue still says what the core says, and
 * the test beside this module pins that, so a reword on either side is a
 * visible decision rather than silent drift. The core sends the state WORD
 * (`live`, `expired`, …), never the sentence, so an app on an older core still
 * renders these.
 *
 * `absent` is in the vocabulary but can never be a row's state (it IS the
 * absence of a row); it is kept because the same table is what a future "this
 * device is not registered" line renders from.
 *
 * An UNKNOWN state (a future core's fifth name) renders as itself — the machine
 * word — rather than being mapped to the nearest known one: guessing would put
 * this app's word in the machine's mouth.
 */

import type { PushDeviceRow } from "@/contracts";
import { activeLocale, t } from "@/i18n";

/** Each known state's catalogue key. A literal map (not a template string) so
 *  the i18n string check sees every key this module renders. */
export const PUSH_DEVICE_STATE_KEYS = {
	live: "mobile.notifications.device_state.live",
	expired: "mobile.notifications.device_state.expired",
	unpaired: "mobile.notifications.device_state.unpaired",
	revoked: "mobile.notifications.device_state.revoked",
	absent: "mobile.notifications.device_state.absent",
} as const;

const isKnownState = (
	state: string,
): state is keyof typeof PUSH_DEVICE_STATE_KEYS =>
	Object.hasOwn(PUSH_DEVICE_STATE_KEYS, state);

/** The reader-facing sentence for a row's state, in the app's language. */
export const deviceStateDescription = (state: string): string =>
	isKnownState(state) ? t(PUSH_DEVICE_STATE_KEYS[state]) : state;

/** The row's title: its name when the machine recorded one, else the platform
 *  it is — never the device id, which names nothing a reader recognises. */
export const deviceTitle = (
	row: Pick<PushDeviceRow, "name" | "platform">,
): string => {
	const name = row.name?.trim();
	if (name !== undefined && name.length > 0) return name;
	return row.platform === "ios" ? "iPhone" : "Android device";
};

/**
 * The Settings list's order and labels: THIS phone first, then the computer's
 * other devices, most recently active first.
 *
 * WHY THIS PHONE IS FOUND BY `device_id`. The install record holds the
 * `device_id` the routed computer minted at this phone's last registration
 * (`install-id.ts` `recordRegistration`), and the registration hook re-registers
 * on every route change, so it is the routed computer's id for this phone. A
 * row is "this phone" only on that exact match — never by platform or name,
 * which another phone shares. `thisDeviceId` is null when the record is absent
 * or not persistent (web), and then no row claims to be this phone.
 */
export interface DeviceListEntry {
	row: PushDeviceRow;
	isThisDevice: boolean;
	title: string;
	/** The line that tells one device from a similar one; null for this phone,
	 *  whose title already says which it is. */
	detail: string | null;
}

export const deviceListEntries = (
	rows: readonly PushDeviceRow[],
	thisDeviceId: string | null,
	locale?: string,
): DeviceListEntry[] => {
	const mine = rows.filter(
		(row) => thisDeviceId !== null && row.device_id === thisDeviceId,
	);
	const others = rows
		.filter((row) => !mine.includes(row))
		.sort((a, b) => b.last_seen_at - a.last_seen_at);
	return [
		...mine.map((row) => ({
			row,
			isThisDevice: true,
			title:
				row.platform === "ios"
					? t("mobile.notifications.devices.this_iphone")
					: t("mobile.notifications.devices.this_android"),
			detail: null,
		})),
		...others.map((row) => ({
			row,
			isThisDevice: false,
			title: deviceTitle(row),
			detail: t("mobile.notifications.devices.last_active", {
				// The catalogue's resolved language, not the device locale, so a
				// French app on an English phone reads one language (design D3);
				// an explicit caller/test locale still wins, as in team-bridge.
				date: new Date(row.last_seen_at * 1000).toLocaleString(
					locale ?? activeLocale(),
					{
						month: "short",
						day: "numeric",
						hour: "numeric",
						minute: "2-digit",
					},
				),
			}),
		})),
	];
};

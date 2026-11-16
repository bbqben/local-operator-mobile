/**
 * The device-list vocabulary, carried verbatim from the core.
 *
 * `push_devices.STATE_DESCRIPTIONS` (local-operator, `mobile/push_devices.py`) is
 * "the product's own words for each state — the CLI's legend renders them and
 * the app's Settings will mirror them … two surfaces that spell the same state
 * two ways is the defect the single resolver exists to prevent". This module is
 * that mirror: the strings are copied, never re-worded, and the test beside it
 * pins each one against the core's own text so a drift is a failing test rather
 * than two screens disagreeing.
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
import { t } from "@/i18n";

/** Copied from `push_devices.STATE_DESCRIPTIONS` (core, fix/push-device-dedupe,
 *  2026-11-16 — the core reworded them as whole sentences, because this screen
 *  renders each on its own line and the old lowercase fragments read as broken
 *  copy). An app on an older core still shows these: they are this table, not
 *  a field the core sends. */
export const PUSH_DEVICE_STATE_DESCRIPTIONS: Readonly<Record<string, string>> =
	{
		live: "Registered. Notifications are delivered to this device.",
		expired:
			"Notifications are paused for this device until you sign in again.",
		unpaired: "This computer is no longer paired.",
		revoked: "This device was revoked on this computer.",
		absent: "Not in this computer's registry; it may register again.",
	};

/** The reader-facing sentence for a row's state. */
export const deviceStateDescription = (state: string): string =>
	PUSH_DEVICE_STATE_DESCRIPTIONS[state] ?? state;

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
				date: new Date(row.last_seen_at * 1000).toLocaleString(locale, {
					month: "short",
					day: "numeric",
					hour: "numeric",
					minute: "2-digit",
				}),
			}),
		})),
	];
};

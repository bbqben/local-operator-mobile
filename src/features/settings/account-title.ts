import { t } from "@/i18n";

/**
 * Settings' account title, as `account-card.tsx` renders it.
 *
 * Signed in with Radient: the identity the live route admitted with
 * (`ConnectionSnapshot.accountLabel` — the grant's email, else its name; never
 * a token), else the generic "Signed in with Radient". Not signed in: "Not
 * signed in with Radient", whatever label is held.
 *
 * Why both inputs: PR #258 keyed the card on `radientSignedIn` because, until
 * this PR, nothing in production wrote a non-null `accountLabel`, so a
 * label-only title told every signed-in reader they were signed out. PR #262
 * writes the label at the source — `routeAdmission` reads the Radient grant's
 * `account_label` — and this lets that label NAME the account on #258's card
 * without moving the signed-in decision off `radientSignedIn`. A custom route
 * carries no label, so a reader holding a grant there keeps the generic line.
 *
 * A plain function, not inline JSX, so `connection-provider.test.ts` can drive
 * the same expression the card renders from a real route admission: Node cannot
 * import Settings' styling stack.
 */
export const settingsAccountTitle = (
	radientSignedIn: boolean,
	accountLabel: string | null,
): string =>
	radientSignedIn
		? (accountLabel ?? t("mobile.settings.account.signed_in_radient"))
		: t("mobile.settings.account.not_signed_in");

/**
 * What Settings' account avatar takes its initials FROM: the label, but only the
 * local part of an email.
 *
 * Why (PR #262 design D1): `initialsOf` splits on `@` and `.` as word breaks, so
 * an email label gave the second initial to the mail provider —
 * `damian@gominerva.com` → "DG", every Gmail user "?G". The local part keeps the
 * mark about the person (`qa` → "QA", `first.last` → "FL", `damian` → "DA") and
 * display names pass through unchanged ("Damian Tran" → "DT"). An address with
 * nothing before the `@` keeps the whole label rather than an empty mark.
 */
export const settingsAccountInitialsSource = (accountLabel: string): string => {
	const at = accountLabel.indexOf("@");
	return at > 0 ? accountLabel.slice(0, at) : accountLabel;
};

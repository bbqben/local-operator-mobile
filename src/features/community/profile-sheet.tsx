/**
 * A member's card (frame M9) and the report flow (RFC §6.4).
 *
 * ONLY APPROVED PROFILE FIELDS. The card renders exactly what the server's
 * `Profile` carries: the member chose which Radient fields to show and each was
 * moderated before it is served. Email and organizations are never part of the
 * shape, so they cannot leak from here. Photos are not drawn yet: the assets
 * proxy is `x-status: planned`, and a URL is never fetched from a profile
 * field, so the avatar is initials until the proxy ships.
 *
 * Message sends a DM REQUEST, not a message (RFC §5.7): the other person
 * accepts before anything can be sent, so the sheet says the request was sent
 * rather than opening a conversation that does not exist yet.
 */
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type CommunityError, isCommunityError } from "@/community/client";
import type {
	Profile,
	RefusalCategory,
	ReportTargetKind,
} from "@/community/contract";
import { useCommunity } from "@/community/provider";
import { t } from "@/i18n";
import { CONTROL, communityReportCategoryId, ROLE, SURFACE } from "@/ui/a11y";
import { Avatar, initialsOf } from "@/ui/components/avatar";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Sheet } from "@/ui/components/sheet";
import { Textarea } from "@/ui/components/textarea";
import { TOUCH_FLOOR } from "@/ui/layout";
import { cx } from "@/ui/variants";
import { categoryLabel, errorSentence, roleLabel } from "./labels";

export function ProfileSheet({
	communityId,
	profile,
	onClose,
}: {
	communityId: string;
	profile: Profile | null;
	onClose: () => void;
}) {
	const { actions } = useCommunity();
	const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	const [busy, setBusy] = useState<"message" | "block" | null>(null);
	const [reporting, setReporting] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the subject id is a TRIGGER to clear the previous member's notice, not a read.
	useEffect(() => {
		setNotice(null);
		setReporting(false);
	}, [profile?.public_id]);
	const run = async (
		kind: "message" | "block",
		action: () => Promise<CommunityError | null>,
		ok: string,
	) => {
		setBusy(kind);
		const failure = await action();
		setBusy(null);
		setNotice(
			failure
				? { text: errorSentence(failure), error: true }
				: { text: ok, error: false },
		);
	};
	const badge = roleLabel(profile?.role);
	return (
		<>
			<Sheet
				visible={profile !== null && !reporting}
				onClose={onClose}
				title={t("mobile.community.profile.title")}
				testID={SURFACE.communityProfileSheet}
			>
				{profile ? (
					<View className="gap-3 pb-3">
						<View className="flex-row items-center gap-3">
							<Avatar initials={initialsOf(profile.display_name)} size="lg" />
							<View className="min-w-0 flex-1 gap-0.5">
								<Text
									className="text-label font-semibold text-ink"
									numberOfLines={2}
								>
									{profile.display_name}
								</Text>
								{profile.title ? (
									<Text className="text-body-sm text-ink-muted">
										{profile.title}
									</Text>
								) : null}
							</View>
						</View>
						{badge || profile.joined_month ? (
							<View className="flex-row flex-wrap items-center gap-2">
								{badge ? <Badge label={badge} tone="info" /> : null}
								{profile.joined_month ? (
									<Text className="text-meta text-ink-dim">
										{t("mobile.community.profile.joined", {
											month: profile.joined_month,
										})}
									</Text>
								) : null}
							</View>
						) : null}
						{profile.description ? (
							<Text className="text-body-sm text-ink">
								{profile.description}
							</Text>
						) : null}
						<Button
							label={t("mobile.community.profile.message")}
							loading={busy === "message"}
							onPress={() =>
								void run(
									"message",
									() => actions.requestDm(communityId, profile.public_id),
									t("mobile.community.profile.message_sent"),
								)
							}
							testID={CONTROL.communityProfileMessage}
						/>
						<View className="flex-row gap-2">
							<View className="flex-1">
								<Button
									label={t("mobile.community.profile.block")}
									variant="outline"
									loading={busy === "block"}
									onPress={() =>
										void run(
											"block",
											() => actions.block(communityId, profile.public_id),
											t("mobile.community.profile.blocked"),
										)
									}
									testID={CONTROL.communityProfileBlock}
								/>
							</View>
							<View className="flex-1">
								<Button
									label={t("mobile.community.profile.report")}
									variant="outline"
									onPress={() => setReporting(true)}
									testID={CONTROL.communityProfileReport}
								/>
							</View>
						</View>
						{notice ? (
							<Text
								accessibilityRole={notice.error ? ROLE.alert : undefined}
								className={cx(
									"text-body-sm",
									notice.error ? "text-danger" : "text-ink-muted",
								)}
							>
								{notice.text}
							</Text>
						) : null}
					</View>
				) : null}
			</Sheet>
			<ReportSheet
				communityId={communityId}
				target={
					reporting && profile
						? { kind: "profile", id: profile.public_id }
						: null
				}
				onClose={() => setReporting(false)}
			/>
		</>
	);
}

const CATEGORIES: readonly RefusalCategory[] = [
	"unsafe_or_illegal",
	"harassment_or_abuse",
	"spam_or_promotion",
	"private_information",
];

/**
 * Report a message, profile or channel to Radient Trust & Safety. One sheet =
 * one idempotency key (minted by the store per submit), and a sent report
 * shows its case reference so the reporter can follow it up.
 */
export function ReportSheet({
	communityId,
	target,
	onClose,
}: {
	communityId: string;
	target: { kind: ReportTargetKind; id: string } | null;
	onClose: () => void;
}) {
	const { actions } = useCommunity();
	const [category, setCategory] = useState<RefusalCategory | null>(null);
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ text: string; error: boolean } | null>(
		null,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the target is a TRIGGER to start a fresh report, not a read.
	useEffect(() => {
		setCategory(null);
		setNote("");
		setResult(null);
	}, [target?.kind, target?.id]);
	const sent = result !== null && !result.error;
	const submit = async () => {
		if (!target || !category || busy || sent) return;
		setBusy(true);
		const outcome = await actions.report(communityId, {
			targetKind: target.kind,
			targetId: target.id,
			category,
			note,
		});
		setBusy(false);
		setResult(
			outcome && !isCommunityError(outcome)
				? {
						text: t("mobile.community.report.sent", {
							reference: outcome.reference,
						}),
						error: false,
					}
				: { text: t("mobile.community.report.failed"), error: true },
		);
	};
	return (
		<Sheet
			visible={target !== null}
			onClose={onClose}
			title={t("mobile.community.report.title")}
			testID={SURFACE.communityReportSheet}
		>
			<View className="gap-3 pb-3">
				<View
					accessibilityRole={ROLE.radiogroup}
					accessibilityLabel={t("mobile.community.report.category")}
					className="gap-1"
				>
					{CATEGORIES.map((value) => {
						const chosen = value === category;
						return (
							<Pressable
								key={value}
								accessibilityRole={ROLE.radio}
								accessibilityState={{ checked: chosen, disabled: sent }}
								disabled={sent}
								onPress={() => setCategory(value)}
								testID={communityReportCategoryId(value)}
								style={{ minHeight: TOUCH_FLOOR }}
							>
								<View
									className={cx(
										"flex-1 flex-row items-center gap-3 rounded-sm px-3 py-2",
										chosen ? "bg-row-selected" : "bg-transparent",
									)}
								>
									<View
										aria-hidden
										className={cx(
											"h-4 w-4 rounded-full border",
											chosen
												? "border-accent bg-accent"
												: "border-border-control",
										)}
									/>
									<Text className="text-body text-ink">
										{categoryLabel(value)}
									</Text>
								</View>
							</Pressable>
						);
					})}
				</View>
				<Textarea
					label={t("mobile.community.report.note")}
					value={note}
					onChangeText={setNote}
					disabled={sent}
					testID={CONTROL.communityReportNote}
				/>
				<Button
					label={t("mobile.community.report.submit")}
					disabled={!category || sent}
					loading={busy}
					onPress={() => void submit()}
					testID={CONTROL.communityReportSubmit}
				/>
				{result ? (
					<Text
						accessibilityRole={result.error ? ROLE.alert : undefined}
						className={cx(
							"text-body-sm",
							result.error ? "text-danger" : "text-ink-muted",
						)}
					>
						{result.text}
					</Text>
				) : null}
			</View>
		</Sheet>
	);
}

/**
 * Joining, and re-accepting after a guidelines update (RFC v2.4 §5.2, §5.11;
 * frames M1/M1b).
 *
 * EXPLICIT ACCEPTANCE IS THE CONTRACT. The server's join body is
 * `{guidelines_version, accept_guidelines: true}`; this sheet is the human act
 * that makes `true` honest. The agreement starts UNCHECKED, Join stays disabled
 * until it is ticked, and the version sent is the one whose text is on screen.
 * If the guidelines change while the person reads, the server answers 409
 * `guidelines_changed`; the store reloads the new text and this sheet clears the
 * tick and says so, so nobody is joined under rules they never saw.
 *
 * NOT HERE YET: the per-field profile toggles of frame M1b. The join contract
 * marks `profile_fields` as planned (sending it today is a 400), so the sheet
 * states what members see (Radient name; never email or organizations) instead
 * of offering toggles that the server would refuse.
 */
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { guidelinesStep } from "@/community/model";
import { useCommunity, useCommunityState } from "@/community/provider";
import { t } from "@/i18n";
import { CONTROL, ROLE, SURFACE } from "@/ui/a11y";
import { Button } from "@/ui/components/button";
import { Sheet } from "@/ui/components/sheet";
import { Skeleton } from "@/ui/components/skeleton";
import { TOUCH_FLOOR } from "@/ui/layout";
import { cx } from "@/ui/variants";
import { errorSentence } from "./labels";
import { LoadFailure } from "./parts";

export function JoinSheet({
	communityId,
	visible,
	onClose,
	onJoined,
}: {
	communityId: string;
	visible: boolean;
	onClose: () => void;
	onJoined?: () => void;
}) {
	const { actions } = useCommunity();
	const boot = useCommunityState((s) => s.bootstraps[communityId]);
	const [agreed, setAgreed] = useState(false);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	useEffect(() => {
		if (visible && !boot) void actions.loadBootstrap(communityId);
	}, [visible, boot, actions, communityId]);
	/* A new version on screen is a new decision: the tick never carries over. */
	const version = boot?.data?.guidelines.version ?? null;
	useEffect(() => {
		if (version) setAgreed(false);
	}, [version]);
	const step = boot?.data ? guidelinesStep(boot.data) : null;
	const reaccept = step === "reaccept";
	const submit = async () => {
		if (!version || !agreed || busy) return;
		setBusy(true);
		setNotice(null);
		const result = await actions.join(communityId, version);
		setBusy(false);
		if (result === "joined") {
			onClose();
			onJoined?.();
		} else if (result === "changed")
			setNotice(t("mobile.community.join.changed"));
		else
			setNotice(
				result ? errorSentence(result) : t("mobile.community.join.failed"),
			);
	};
	return (
		<Sheet
			visible={visible}
			onClose={onClose}
			title={
				reaccept
					? t("mobile.community.join.reaccept_title")
					: t("mobile.community.join.title")
			}
			detent="full"
			testID={SURFACE.communityJoinSheet}
			footer={
				boot?.data ? (
					<View className="gap-2 pb-2">
						<Pressable
							accessibilityRole={ROLE.checkbox}
							accessibilityState={{ checked: agreed }}
							accessibilityLabel={t("mobile.community.join.agree", {
								version: version ?? "",
							})}
							onPress={() => setAgreed((value) => !value)}
							testID={CONTROL.communityJoinAgree}
							style={{ minHeight: TOUCH_FLOOR }}
						>
							<View className="flex-row items-start gap-3 py-1">
								<View
									className={cx(
										"mt-0.5 h-5 w-5 items-center justify-center rounded-sm border",
										agreed
											? "border-accent bg-accent"
											: "border-border-control bg-transparent",
									)}
									aria-hidden
								>
									{agreed ? (
										<Text className="text-mono-label text-on-accent">✓</Text>
									) : null}
								</View>
								<Text className="min-w-0 flex-1 text-body-sm text-ink">
									{t("mobile.community.join.agree", { version: version ?? "" })}
								</Text>
							</View>
						</Pressable>
						<Button
							label={
								reaccept
									? t("mobile.community.join.reaccept_submit")
									: t("mobile.community.join.submit")
							}
							disabled={!agreed}
							loading={busy}
							onPress={() => void submit()}
							testID={CONTROL.communityJoinSubmit}
						/>
						{!agreed ? (
							<Text className="text-center text-meta text-ink-dim">
								{t("mobile.community.join.hint")}
							</Text>
						) : null}
						{notice ? (
							<Text
								accessibilityRole={ROLE.alert}
								className="text-body-sm text-danger"
							>
								{notice}
							</Text>
						) : null}
					</View>
				) : undefined
			}
		>
			{!boot || boot.state === "loading" ? (
				<View
					accessible
					accessibilityLabel={t("mobile.community.common.loading")}
				>
					<Skeleton lines={4} />
				</View>
			) : boot.state === "error" || !boot.data ? (
				<LoadFailure
					error={boot.error}
					onRetry={() => void actions.loadBootstrap(communityId)}
				/>
			) : (
				<View className="gap-3 pb-3">
					<Text
						accessibilityRole={ROLE.header}
						className="text-label font-semibold text-ink"
					>
						{t("mobile.community.join.guidelines_heading", {
							version: boot.data.guidelines.version,
						})}
					</Text>
					{/* Server-authored guidelines text, rendered as text, never markup. */}
					<Text className="text-body-sm text-ink">
						{boot.data.guidelines.text}
					</Text>
					<Text className="text-body-sm text-ink-muted">
						{t("mobile.community.join.moderation")}
					</Text>
					<Text className="text-body-sm text-ink-muted">
						{t("mobile.community.join.profile")}
					</Text>
				</View>
			)}
		</Sheet>
	);
}

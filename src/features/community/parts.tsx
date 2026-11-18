/**
 * Small pieces every community screen shares: the row, the section heading,
 * the load-failure block and the route frame.
 *
 * WHY ONE FRAME FOR EVERY ROUTE. The community is DARK (`flag.ts`) and needs a
 * Radient sign-in of its own (RFC §7.2: the phone is a direct client). Every
 * `/community/*` route goes through `CommunityFrame` so none can be reached by a
 * deep link while the flag is off, and none paints community chrome for a
 * signed-out reader, rather than each screen repeating (and drifting on) the
 * two checks.
 */
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { CommunityError } from "@/community/client";
import { communityEnabled } from "@/community/flag";
import { useConnection } from "@/features/auth/connection-provider";
import { countLabel } from "@/features/notifications/notifications-model";
import { t } from "@/i18n";
import { communityFixture } from "@/testing/community-fixture";
import { state as a11yState, CONTROL, ROLE } from "@/ui/a11y";
import { BackButton } from "@/ui/components/back-button";
import { Button } from "@/ui/components/button";
import { Screen } from "@/ui/components/screen";
import { TOUCH_FLOOR } from "@/ui/layout";
import { cx } from "@/ui/variants";
import { errorSentence } from "./labels";

export function CommunityBack({
	fallback = "/team-bridge",
}: {
	fallback?: string;
}) {
	const router = useRouter();
	return (
		<BackButton
			accessibilityLabel={t("mobile.team_bridge.back")}
			testID={CONTROL.teamBridgeBack}
			onPress={() =>
				router.canGoBack()
					? router.back()
					: router.replace(fallback as Parameters<typeof router.replace>[0])
			}
		/>
	);
}

/**
 * The route frame: the flag and the sign-in, before any community chrome. A
 * web fixture build stands in a synthetic token for the sign-in (the seam's own
 * gates keep that path out of every real build).
 */
export function CommunityFrame({
	title,
	testID,
	headerAction,
	headerDetail,
	scroll = true,
	fallback,
	children,
}: {
	title: string;
	testID: string;
	headerAction?: ReactNode;
	headerDetail?: ReactNode;
	scroll?: boolean;
	fallback?: string;
	children: ReactNode;
}) {
	const connection = useConnection();
	const signedIn =
		Boolean(connection.radientAccountId) || communityFixture() !== null;
	const open = communityEnabled() && signedIn;
	return (
		<Screen
			title={open ? title : t("mobile.community.common.unavailable")}
			headerLeading={<CommunityBack fallback={fallback} />}
			headerAction={open ? headerAction : undefined}
			headerDetail={open ? headerDetail : undefined}
			scroll={scroll}
			testID={testID}
		>
			{open ? (
				children
			) : (
				<View className="gap-3 px-4 py-6">
					<Text className="text-body text-ink-muted">
						{signedIn
							? t("mobile.community.error.not_found")
							: t("mobile.community.error.sign_in")}
					</Text>
				</View>
			)}
		</Screen>
	);
}

export function SectionLabel({ label }: { label: string }) {
	return (
		<Text
			accessibilityRole={ROLE.header}
			className="px-4 pb-1 pt-4 text-meta font-semibold text-ink-dim"
		>
			{label}
		</Text>
	);
}

/** A failed read, its cause, and a retry. `role=alert` so it is announced. */
export function LoadFailure({
	error,
	onRetry,
}: {
	error: CommunityError | null;
	onRetry: () => void;
}) {
	return (
		<View className="gap-2 px-4 py-3">
			<Text accessibilityRole={ROLE.alert} className="text-body-sm text-danger">
				{errorSentence(error)}
			</Text>
			<View className="self-start">
				<Button
					label={t("mobile.community.common.retry")}
					variant="outline"
					size="sm"
					testID={CONTROL.communityLoadRetry}
					onPress={onRetry}
				/>
			</View>
		</View>
	);
}

/** A tappable list row: a leading glyph, a label, an optional detail, a trailing slot. */
export function CommunityRow({
	label,
	detail,
	leading,
	trailing,
	accessibilityLabel,
	selected,
	bold,
	onPress,
	testID,
}: {
	label: string;
	detail?: string | null;
	leading?: ReactNode;
	trailing?: ReactNode;
	accessibilityLabel?: string;
	selected?: boolean;
	bold?: boolean;
	onPress: () => void;
	testID: string;
}) {
	return (
		<Pressable
			accessibilityRole={ROLE.button}
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={a11yState({ selected: selected || undefined })}
			onPress={onPress}
			testID={testID}
			style={{ minHeight: TOUCH_FLOOR }}
		>
			{({ pressed }) => (
				<View
					className={cx(
						"flex-1 flex-row items-center gap-3 rounded-sm px-4 py-2",
						selected
							? "bg-row-selected"
							: pressed
								? "bg-row-hover"
								: "bg-transparent",
					)}
				>
					{leading ? (
						<View
							aria-hidden
							accessibilityElementsHidden
							importantForAccessibility="no-hide-descendants"
						>
							{leading}
						</View>
					) : null}
					<View className="min-w-0 flex-1 justify-center">
						<Text
							className={cx("text-body text-ink", bold ? "font-semibold" : "")}
							numberOfLines={1}
						>
							{label}
						</Text>
						{detail ? (
							<Text className="text-meta text-ink-dim" numberOfLines={2}>
								{detail}
							</Text>
						) : null}
					</View>
					{trailing}
				</View>
			)}
		</Pressable>
	);
}

/** The unread pill; nothing for zero (unknown is not drawn as zero either). */
export function UnreadPill({ count }: { count: number }) {
	if (!count) return null;
	return (
		<View
			className="rounded-full bg-accent px-2 py-0.5"
			aria-hidden
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<Text className="text-mono-label tabular-nums text-on-accent">
				{countLabel(count)}
			</Text>
		</View>
	);
}

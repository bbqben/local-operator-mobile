/**
 * The reply-thread affordance under a ROOT message in the conversation
 * timeline: how many replies, who replied, and an unread badge while this
 * reader has unread replies there. Tapping it opens the thread.
 *
 * WHY IT EXISTS. The hub keeps replies OUT of the conversation timeline, so
 * without this a phone reader saw the roots of agents' threaded replies and no
 * sign that anything had been said under them. Threading in channels only
 * works when every client shows the count and the per-thread unread on the
 * root (the desktop's `team-bridge-thread-row.tsx` does).
 *
 * Everything shown is served (`reply-threads.ts`, THE PROJECTION RULE). The
 * badge is the conversation list's unread pill, so "unread" looks the same
 * wherever the reader meets it.
 */
import { MessagesSquare } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { countLabel } from "@/features/notifications/notifications-model";
import { type ShippedLocale, t } from "@/i18n";
import {
	type ReplyThreadSummary,
	showsThreadUnread,
} from "@/team-bridge/reply-threads";
import {
	ROLE,
	teamBridgeReplyThreadOpenId,
	teamBridgeReplyThreadUnreadId,
} from "@/ui/a11y";
import { useTokenColor } from "@/ui/appearance";
import { TOUCH_FLOOR } from "@/ui/layout";

/**
 * The repliers as one list in the reader's language ("Ada and Ben" / "Ada y
 * Ben"). `Intl.ListFormat` where the engine has it; a plain comma join where it
 * does not, which is still readable and never throws.
 */
export function participantsLine(
	labels: readonly string[],
	locale: ShippedLocale,
): string {
	if (labels.length === 0) return "";
	try {
		return new Intl.ListFormat(locale, {
			style: "short",
			type: "conjunction",
		}).format(labels);
	} catch {
		return labels.join(", ");
	}
}

export function ReplyThreadChip({
	rootId,
	summary,
	locale,
	onOpen,
}: {
	rootId: string;
	summary: ReplyThreadSummary;
	locale: ShippedLocale;
	onOpen: (rootId: string) => void;
}) {
	const accent = useTokenColor("accent");
	const unread = showsThreadUnread(summary) ? (summary.unread ?? 0) : 0;
	const people = participantsLine(summary.participants, locale);
	return (
		<Pressable
			accessibilityRole={ROLE.button}
			accessibilityLabel={
				unread > 0
					? t("mobile.team_bridge.reply_thread.open_unread", {
							count: summary.count,
							unread,
						})
					: t("mobile.team_bridge.reply_thread.open", { count: summary.count })
			}
			testID={teamBridgeReplyThreadOpenId(rootId)}
			onPress={() => onOpen(rootId)}
			/* The touch floor, not the text's height: this is the only way into
			 *  the thread from the timeline. */
			style={{ minHeight: TOUCH_FLOOR }}
			className="-ms-1 mt-0.5 flex-row items-center self-start"
		>
			{({ pressed }) => (
				<View
					className={`flex-row items-center gap-2 rounded-sm px-1 py-1 ${pressed ? "bg-row-selected" : ""}`}
				>
					<MessagesSquare size={15} color={accent} aria-hidden />
					<Text className="text-meta font-semibold text-accent">
						{t("mobile.team_bridge.reply_thread.count", {
							count: summary.count,
						})}
					</Text>
					{people ? (
						<Text
							className="min-w-0 shrink text-meta text-ink-muted"
							numberOfLines={1}
						>
							{people}
						</Text>
					) : null}
					{unread > 0 ? (
						<View
							className="rounded-full bg-accent px-2 py-0.5"
							testID={teamBridgeReplyThreadUnreadId(rootId)}
						>
							<Text className="text-mono-label tabular-nums text-on-accent">
								{countLabel(unread)}
							</Text>
						</View>
					) : null}
				</View>
			)}
		</Pressable>
	);
}

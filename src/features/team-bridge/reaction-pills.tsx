/**
 * Reaction pills under a Team Bridge message, and the one toggle every
 * reaction control goes through.
 *
 * WHY (operator: "there's no way to react … on mobile team bridge … port
 * [Slack and Discord] over"). Slack: "Any reactions you add … will be
 * highlighted in blue. Simply … tap the reaction to remove it"; Discord:
 * remove "by selecting the emoji you used to react". So a pill IS a toggle:
 * tap another's → +1 and mine; tap mine → back; my sole reaction → the pill
 * goes. Spec: lop-dev "Mobile Team Bridge: reactions and start-a-thread",
 * slice PR b — §4.3 pills, §4.5 haptics, §4.6 accessibility, §4.8 rollback.
 *
 * WHAT IT READS. The held message's `reactions` (the hub's summary), unless a
 * toggle for this message is in flight, in which case the store's optimistic
 * rows (`reactionPending`) — which is also why a poll landing mid-write cannot
 * flicker a pill back. A hub that does not serve reactions
 * (`reactionsUnserved`) renders nothing at all, not an error.
 *
 * ZERO COST AT REST. A message with no reactions renders `null`: no row, no
 * `+`, no added height (the entry point is the long-press sheet's quick row).
 */
import { SmilePlus } from "lucide-react-native";
import { memo, useCallback } from "react";
import {
	AccessibilityInfo,
	ActivityIndicator,
	Pressable,
	Text,
	View,
} from "react-native";
import { type ShippedLocale, t } from "@/i18n";
import { haptic } from "@/lib/haptics";
import type { Message, Reaction } from "@/team-bridge/contract";
import { useTeamBridge, useTeamBridgeState } from "@/team-bridge/provider";
import { reactionTotal } from "@/team-bridge/reactions";
import { type ReactionTarget, reactionKey } from "@/team-bridge/store";
import { ROLE, SURFACE, teamBridgeReactionPillId } from "@/ui/a11y";
import { useTokenColor } from "@/ui/appearance";
import { cx } from "@/ui/variants";

const NO_REACTIONS: readonly Reaction[] = [];

/** Pill height (spec §4.3): 28 pt, padded to the 44 pt touch floor by an
 *  8 pt slop above and below. Wrapped lines therefore sit ≥ 16 pt apart
 *  (`gap-y-4`) so the slops never overlap ("hit areas may never overlap"). */
const PILL_HEIGHT = 28;
const PILL_SLOP = { top: 8, bottom: 8 } as const;
/* 16 pt glyph (spec §4.3). A style, not a type token: emoji are drawn by the
 *  system font and no text role in the kit is this size. */
const EMOJI_GLYPH = { fontSize: 16, lineHeight: 20 } as const;

/**
 * The toggle, with the feedback the store cannot give (it is Node-tested):
 * `selection` on the tap (spec §4.5), `warning` on a refusal, and a polite
 * announcement of the result (§4.6). A second tap while this message's write
 * is in flight is dropped here before any feedback, and again in the store.
 */
export function useReactionToggle() {
	const { actions, store } = useTeamBridge();
	return useCallback(
		async (target: ReactionTarget, emoji: string) => {
			const state = store.getState();
			if (state.reactionsUnserved || state.reactionPending[reactionKey(target)])
				return;
			haptic("selection");
			const outcome = await actions.toggleReaction(target, emoji);
			if (outcome === "failed") {
				haptic("warning");
				AccessibilityInfo.announceForAccessibility(
					t("mobile.team_bridge.reactions.failed"),
				);
			} else if (outcome === "added" || outcome === "removed") {
				AccessibilityInfo.announceForAccessibility(
					t(`mobile.team_bridge.reactions.${outcome}`),
				);
			}
		},
		[actions, store],
	);
}

/** The rows a message shows now: optimistic while a write is in flight. */
export function useShownReactions(
	tenantId: string,
	message: Pick<Message, "id" | "conversation_id" | "reactions">,
) {
	const key = reactionKey({
		tenantId,
		conversationId: message.conversation_id,
		messageId: message.id,
	});
	const pending = useTeamBridgeState((s) => s.reactionPending[key]);
	const failed = useTeamBridgeState((s) => s.reactionFailed[key] === true);
	const unserved = useTeamBridgeState((s) => s.reactionsUnserved);
	return {
		rows: pending?.rows ?? message.reactions ?? NO_REACTIONS,
		pendingEmoji: pending?.emoji ?? null,
		failed,
		unserved,
	};
}

/** A count as the app locale writes it; compact past 999 (spec §4.3, "many"). */
export const reactionCount = (count: number, locale: ShippedLocale): string =>
	new Intl.NumberFormat(locale, {
		notation: count >= 1000 ? "compact" : "standard",
	}).format(count);

/** The screen-reader name of one pill: one ICU message per state, so the word
 *  order is the translator's. The emoji is spoken by its system name. */
export const pillLabel = (reaction: Reaction): string =>
	t(
		reaction.reacted_by_me
			? "mobile.team_bridge.reactions.pill_mine"
			: "mobile.team_bridge.reactions.pill",
		{ emoji: reaction.emoji, count: reaction.count },
	);

export const ReactionPills = memo(function ReactionPills({
	message,
	tenantId,
	locale,
	canReact,
	onAdd,
	onLongPress,
}: {
	message: Message;
	tenantId: string;
	/** A prop, not a read, for the row's memo reason (`ThreadMessageRow`). */
	locale: ShippedLocale;
	/** False in a read-only conversation: pills show, but do not toggle. */
	canReact: boolean;
	/** The trailing `+`: opens the message-actions sheet at its quick row. */
	onAdd?: () => void;
	/** The row's long-press, so a hold on a pill still opens the sheet rather
	 *  than turning into a tap on release (the reply chip's rule, PR #339). */
	onLongPress?: () => void;
}) {
	const { rows, pendingEmoji, failed, unserved } = useShownReactions(
		tenantId,
		message,
	);
	const toggle = useReactionToggle();
	const spinner = useTokenColor("ink-muted");
	const plusColor = useTokenColor("ink-muted");
	if (unserved || (rows.length === 0 && !failed)) return null;
	const target = {
		tenantId,
		conversationId: message.conversation_id,
		messageId: message.id,
	};
	return (
		<View className="mt-1" testID={SURFACE.teamBridgeReactionPills}>
			{rows.length > 0 ? (
				<View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-4">
					{/* The summary a screen reader lands on first (§4.6). Out of
					 *  the layout, still in the accessibility tree. */}
					<Text style={VISUALLY_HIDDEN} accessibilityRole={ROLE.text}>
						{t("mobile.team_bridge.reactions.summary", {
							count: reactionTotal(rows),
						})}
					</Text>
					{rows.map((reaction) => {
						const mine = reaction.reacted_by_me;
						const busy = pendingEmoji === reaction.emoji;
						return (
							<Pressable
								key={reaction.emoji}
								accessibilityRole={ROLE.button}
								accessibilityLabel={pillLabel(reaction)}
								accessibilityHint={
									canReact
										? t(
												mine
													? "mobile.team_bridge.reactions.hint_remove"
													: "mobile.team_bridge.reactions.hint_add",
											)
										: undefined
								}
								accessibilityState={{
									selected: mine,
									busy,
									disabled: !canReact,
								}}
								disabled={!canReact}
								hitSlop={PILL_SLOP}
								testID={teamBridgeReactionPillId(reaction.emoji)}
								onPress={() => void toggle(target, reaction.emoji)}
								onLongPress={onLongPress}
								style={{ height: PILL_HEIGHT }}
								className={cx(
									"flex-row items-center gap-1 rounded-full border px-2.5",
									/* Mine carries an `accent-border` ring: its wash measured
									 *  1.01:1 on the light canvas, so the hue alone cannot say
									 *  "yours" outdoors (spec §4.3; contrast contract row
									 *  "team bridge own reaction pill"). */
									mine
										? "border-accent-border bg-accent-wash"
										: "border-border-control bg-elevated",
								)}
							>
								<Text style={EMOJI_GLYPH} aria-hidden>
									{reaction.emoji}
								</Text>
								<View>
									{/* Pending: the count is hidden IN PLACE under the spinner,
									 *  so the pill keeps its width (§4.3 "pending"). */}
									<Text
										className={cx(
											"text-meta tabular-nums",
											mine ? "font-semibold text-accent" : "text-ink-muted",
											busy && "opacity-0",
										)}
									>
										{reactionCount(reaction.count, locale)}
									</Text>
									{busy ? (
										<View className="absolute inset-0 items-center justify-center">
											<ActivityIndicator size="small" color={spinner} />
										</View>
									) : null}
								</View>
							</Pressable>
						);
					})}
					{canReact && onAdd ? (
						<Pressable
							accessibilityRole={ROLE.button}
							accessibilityLabel={t("mobile.team_bridge.reactions.add")}
							hitSlop={PILL_SLOP}
							testID={SURFACE.teamBridgeReactionAdd}
							onPress={onAdd}
							onLongPress={onLongPress}
							style={{ height: PILL_HEIGHT, width: PILL_HEIGHT }}
							className="items-center justify-center rounded-full border border-border-control bg-elevated"
						>
							<SmilePlus size={16} color={plusColor} aria-hidden />
						</Pressable>
					) : null}
				</View>
			) : null}
			{failed ? (
				<Text
					className="mt-1 text-meta text-danger"
					testID={SURFACE.teamBridgeReactionError}
				>
					{t("mobile.team_bridge.reactions.failed")}
				</Text>
			) : null}
		</View>
	);
});

/** Out of the layout and out of sight, still in the accessibility tree (the
 *  composer's `VISUALLY_HIDDEN`, the web's `sr-only`). */
const VISUALLY_HIDDEN = {
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
} as const;

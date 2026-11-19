/**
 * The Team Bridge message-actions sheet: long-press any message and a bottom
 * sheet rises with what you can do to it (operator: "there's no way to react
 * or post in a thread on mobile team bridge … port [Slack and Discord] over").
 *
 * WHY A SHEET ON LONG-PRESS. Both apps open their message menu with "tap and
 * hold the message" (Slack help 202931348, Discord 360057382374); a touch
 * screen has no hover toolbar like the desktop's. The spec this implements is
 * the lop-dev "Mobile Team Bridge: reactions and start-a-thread" design spec,
 * slice PR a (§4.2 sheet, §4.5 haptics, §4.6 accessibility). The quick-reaction
 * row that tops the sheet in Slack lands with reactions (slice b); this slice
 * ships the actions list only.
 *
 * WHAT IT OFFERS, in a fixed order (an omitted row closes the gap; nothing is
 * ever greyed out):
 *  - Reply in thread: ROOT rows only. It is the only way to START a thread —
 *    before this the timeline's only entry to a thread was the reply chip,
 *    which renders only once a root already has replies. Threads are one level
 *    deep (the hub refuses a reply as a root), so a reply row never offers it.
 *  - Copy text: the message as plain text (formatting markers dropped, the
 *    same projection "Select text" shows).
 *  - Select text: the existing drag-to-select mode. Long-press used to enter
 *    it directly; the sheet now owns long-press (Slack's own pattern, and the
 *    label Slack uses), so selection moved here. On Android that makes partial
 *    selection one tap further away, in Bridge only (`HostSelection`).
 *
 * LONG-PRESS IS NEVER THE ONLY PATH. The same actions ride on every body leaf
 * as `accessibilityActions`, which VoiceOver's rotor and TalkBack's actions
 * menu reach without a hold (`messageActionAccessibility`).
 */
import * as Clipboard from "expo-clipboard";
import { Copy, MessageSquareReply, TextCursor } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AccessibilityActionEvent,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { createAttachmentSheetHandoff } from "@/features/session/attach-handoff";
import type { SelectTextAccessibility } from "@/features/session/components/selectable-message";
import { requestTextSelection } from "@/features/session/components/selectable-message";
import { markdownPlainText } from "@/features/session/markdown";
import { t } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { useUiStore } from "@/state/ui-store";
import type { Message } from "@/team-bridge/contract";
import { ROLE, SURFACE, teamBridgeMessageActionId } from "@/ui/a11y";
import { useTokenColor } from "@/ui/appearance";
import { Sheet } from "@/ui/components/sheet";
import { cx } from "@/ui/variants";

export type MessageAction = "reply_in_thread" | "copy_text" | "select_text";

/** Which screen a row lives on. The timeline stays mounted under the reply
 *  thread, so one message can be on screen twice; the selection id must tell
 *  the two copies apart. */
export type MessageActionsScope = "timeline" | "reply";

/**
 * The actions a message offers, in display order. Pure, so the omission rules
 * are pinned without a renderer.
 */
export const messageActions = (
	message: Pick<Message, "body" | "thread_root_id">,
	options: { canReplyInThread: boolean },
): MessageAction[] => {
	const list: MessageAction[] = [];
	if (options.canReplyInThread && !message.thread_root_id)
		list.push("reply_in_thread");
	// An image-only message has `body: ""`: nothing to copy or select.
	if ((message.body ?? "").trim().length > 0)
		list.push("copy_text", "select_text");
	return list;
};

/** The selection-mode id of one message on one screen (`HostSelection.id`). */
export const bridgeSelectionId = (
	scope: MessageActionsScope,
	messageId: string,
): string => `team-bridge:${scope}:${messageId}`;

const ACTION_LABEL: Record<MessageAction, () => string> = {
	reply_in_thread: () => t("mobile.team_bridge.actions.reply_in_thread"),
	copy_text: () => t("mobile.team_bridge.actions.copy_text"),
	select_text: () => t("mobile.team_bridge.actions.select_text"),
};

const ACTION_ICON = {
	reply_in_thread: MessageSquareReply,
	copy_text: Copy,
	select_text: TextCursor,
} as const;

const NO_ACCESSIBILITY: SelectTextAccessibility = {};

/**
 * The screen-reader face of the sheet: one custom action per offered row, run
 * directly (there is no sheet to dismiss first). Labels are read at call time,
 * so the caller recomputes on a language change (the row's `locale` prop).
 */
export const messageActionAccessibility = (
	actions: readonly MessageAction[],
	run: (action: MessageAction) => void,
): SelectTextAccessibility =>
	actions.length === 0
		? NO_ACCESSIBILITY
		: {
				accessibilityActions: actions.map((name) => ({
					name,
					label: ACTION_LABEL[name](),
				})),
				onAccessibilityAction: (event: AccessibilityActionEvent) => {
					const name = event.nativeEvent.actionName as MessageAction;
					if (actions.includes(name)) run(name);
				},
			};

/** What a row needs from its screen. Stable across renders while its inputs
 *  are, so the memoised rows are not re-rendered by it. */
export type MessageActionsController = {
	scope: MessageActionsScope;
	list: (message: Message) => MessageAction[];
	open: (message: Message) => void;
	run: (action: MessageAction, message: Message) => void;
};

/**
 * One screen's sheet: its open state, the handoff out of it, and the actions.
 * Returns the controller for the rows, the id of the row whose sheet is open
 * (it holds the selected tint so the reader keeps the referent), and the
 * sheet element to mount beside the screen's other sheets.
 */
export function useMessageActions({
	scope,
	canReplyInThread,
	onReplyInThread,
}: {
	scope: MessageActionsScope;
	canReplyInThread: boolean;
	onReplyInThread?: (rootId: string) => void;
}) {
	const [target, setTarget] = useState<{
		message: Message;
		open: boolean;
	} | null>(null);
	const showToast = useUiStore((state) => state.showToast);
	/* The attach sheet's handoff rule: on iOS a choice runs only after the
	 *  modal's native dismissal (`onDismiss`), because a push or a focused
	 *  selection view started under a still-presented modal is swallowed by
	 *  it. Elsewhere it runs at once (Android never fires `onDismiss`). */
	const handoff = useRef(createAttachmentSheetHandoff()).current;
	useEffect(() => () => handoff.cancel(), [handoff]);
	const replyRef = useRef(onReplyInThread);
	replyRef.current = onReplyInThread;
	const replyable = canReplyInThread && onReplyInThread !== undefined;

	const list = useCallback(
		(message: Message) =>
			messageActions(message, { canReplyInThread: replyable }),
		[replyable],
	);
	const run = useCallback(
		(action: MessageAction, message: Message) => {
			if (action === "reply_in_thread") {
				replyRef.current?.(message.id);
				return;
			}
			if (action === "copy_text") {
				void Clipboard.setStringAsync(
					markdownPlainText(message.body ?? ""),
				).then(() => showToast(t("mobile.team_bridge.actions.copied")));
				return;
			}
			requestTextSelection(bridgeSelectionId(scope, message.id));
		},
		[scope, showToast],
	);
	const open = useCallback(
		(message: Message) => {
			// The spec's long-press tick (§4.5): an action was taken.
			haptic("light");
			handoff.cancel();
			setTarget({ message, open: true });
		},
		[handoff],
	);
	const controller = useMemo<MessageActionsController>(
		() => ({ scope, list, open, run }),
		[scope, list, open, run],
	);

	const close = useCallback(
		() =>
			setTarget((current) => (current ? { ...current, open: false } : null)),
		[],
	);
	const dismissed = useCallback(() => {
		handoff.dismissed();
		setTarget((current) => (current && !current.open ? null : current));
	}, [handoff]);
	const message = target?.message ?? null;
	const choose = useCallback(
		(action: MessageAction) => {
			if (!message) return;
			close();
			handoff.choose(() => run(action, message), Platform.OS);
			// Android never fires `onDismiss`, so nothing else clears the
			// closed target there; keeping it would pin the row's tint.
			if (Platform.OS !== "ios")
				setTarget((current) => (current && !current.open ? null : current));
		},
		[message, close, handoff, run],
	);

	const sheet = (
		<MessageActionsSheet
			visible={target?.open === true}
			actions={message ? list(message) : []}
			onChoose={choose}
			onClose={() => {
				close();
				if (Platform.OS !== "ios") setTarget(null);
			}}
			onDismiss={dismissed}
		/>
	);
	return {
		controller,
		openMessageId: target?.open ? target.message.id : null,
		sheet,
	};
}

/** The sheet itself: a titled list of 48 pt rows (§4.2), 20 pt icons. */
export function MessageActionsSheet({
	visible,
	actions,
	onChoose,
	onClose,
	onDismiss,
}: {
	visible: boolean;
	actions: readonly MessageAction[];
	onChoose: (action: MessageAction) => void;
	onClose: () => void;
	onDismiss?: () => void;
}) {
	const iconColor = useTokenColor("ink-muted");
	return (
		<Sheet
			visible={visible}
			onClose={onClose}
			onDismiss={onDismiss}
			title={t("mobile.team_bridge.actions.title")}
			testID={SURFACE.teamBridgeMessageActionsSheet}
		>
			<View className="pb-2">
				{actions.map((action) => {
					const Icon = ACTION_ICON[action];
					const label = ACTION_LABEL[action]();
					return (
						<Pressable
							key={action}
							accessibilityRole={ROLE.button}
							accessibilityLabel={label}
							testID={teamBridgeMessageActionId(action)}
							onPress={() => onChoose(action)}
							style={{ minHeight: 48 }}
						>
							{({ pressed }) => (
								<View
									className={cx(
										"flex-1 flex-row items-center gap-3 rounded-sm px-3",
										pressed ? "bg-row-hover" : "bg-transparent",
									)}
								>
									<Icon size={20} color={iconColor} aria-hidden />
									<Text className="min-w-0 flex-1 text-body text-ink">
										{label}
									</Text>
								</View>
							)}
						</Pressable>
					);
				})}
			</View>
		</Sheet>
	);
}

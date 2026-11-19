import { useContext, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import type { BridgeCardBody } from "@/contracts";
import {
	type BridgeBodyState,
	type BridgeBodyView,
	bridgeBodyView,
} from "@/features/session/bridge-card-body";
import { Markdown } from "@/features/session/components/markdown";
import {
	needsUserMessageClamp,
	UserMessageCollapseContext,
	userMessageClipHeight,
} from "@/features/session/user-message-clamp";
import { type NoParamKey, t } from "@/i18n";
import { ROLE } from "@/ui/a11y";
import { TOUCH_FLOOR } from "@/ui/layout";
import { useTextScale } from "@/ui/text-scale-provider";

/** Loads one card's answer, or `null` when the read failed. Supplied by the
 *  screen ONLY when the relay advertises `team_bridge_card_body`
 *  (`bridgeCardBodyServed`); absent, the receipt row renders exactly as before. */
export type BridgeBodyLoader = (
	entryId: string,
) => Promise<BridgeCardBody | null>;

const STATE_KEY: Record<BridgeBodyState, NoParamKey> = {
	pending: "mobile.team_bridge.card_body.pending",
	held: "mobile.team_bridge.card_body.held",
	held_transient: "mobile.team_bridge.card_body.held_transient",
	refused: "mobile.team_bridge.card_body.refused",
	not_admitted: "mobile.team_bridge.card_body.not_admitted",
	signed_out: "mobile.team_bridge.card_body.signed_out",
	other_account: "mobile.team_bridge.card_body.other_account",
	not_member: "mobile.team_bridge.card_body.not_member",
	offline: "mobile.team_bridge.card_body.offline",
	deleted: "mobile.team_bridge.card_body.deleted",
	unavailable: "mobile.team_bridge.card_body.unavailable",
};

/**
 * The body region of an inbound Team Bridge card: the admitted message as
 * markdown under the untrusted framing, or the relay's stated outcome in words
 * (`bridge-card-body.ts` carries the rules).
 *
 * FETCHED ON MOUNT, HELD IN STATE ONLY. The transcript list mounts rows as they
 * scroll into its window, so the read is already lazy; keeping the answer in
 * this component (never a store or disk cache) is what keeps revocation live —
 * a message deleted or a membership left is gone on the next mount.
 */
export const BridgeCardBodyRegion = ({
	entryId,
	load,
	testID,
}: {
	entryId: string;
	load: BridgeBodyLoader;
	testID?: string;
}) => {
	const [view, setView] = useState<BridgeBodyView | null>(null);
	useEffect(() => {
		let live = true;
		setView(null);
		load(entryId).then(
			(answer) => {
				if (live) setView(bridgeBodyView(answer));
			},
			() => {
				if (live) setView(bridgeBodyView(null));
			},
		);
		return () => {
			live = false;
		};
	}, [entryId, load]);
	return <BridgeCardBodyLines view={view} testID={testID} />;
};

/** The region for one resolved view (`null` while loading). Split from the
 *  fetching shell so each state renders under test without an effect. */
export const BridgeCardBodyLines = ({
	view,
	testID,
}: {
	view: BridgeBodyView | null;
	testID?: string;
}) => {
	if (view === null) {
		return (
			<Text className="text-meta text-ink-dim" testID={testID}>
				{t("mobile.team_bridge.card_body.loading")}
			</Text>
		);
	}
	const hasBody = view.lines.some((line) => line.kind === "body");
	return (
		<View className="mt-1 gap-1" testID={testID}>
			{/* The framing sits above any third-party text, never above a state
			 *  sentence: the sentence is the app's own words, not untrusted. */}
			{hasBody ? (
				<Text className="text-meta text-ink-muted">
					{t("mobile.team_bridge.card_body.untrusted")}
				</Text>
			) : null}
			{view.lines.map((line, index) =>
				line.kind === "body" ? (
					<View
						// Items arrive in the relay's order and the list is
						// replaced whole, so the index is a stable key here.
						// biome-ignore lint/suspicious/noArrayIndexKey: see above.
						key={index}
						/* `border-control`, not `border-hairline`: this rail is what
						 *  scopes the untrusted text, and the hairline (1.25:1 light)
						 *  is also the markdown blockquote rule, so a sender's own
						 *  quote painted the same edge (design round 1, D3). */
						className="border-s-2 border-border-control ps-3"
					>
						<BodyClamp testID={testID ? `${testID}-more-${index}` : undefined}>
							<Markdown text={line.markdown} />
						</BodyClamp>
					</View>
				) : (
					<Text
						// biome-ignore lint/suspicious/noArrayIndexKey: see above.
						key={index}
						className="text-body-sm text-ink-muted"
					>
						{t(STATE_KEY[line.state])}
					</Text>
				),
			)}
			{view.more > 0 ? (
				<Text className="text-meta text-ink-dim">
					{t("mobile.team_bridge.card_body.more_messages", {
						count: view.more,
					})}
				</Text>
			) : null}
		</View>
	);
};

/**
 * A long body collapses behind Show more / Show less at the reader's own-message
 * clamp height (`user-message-clamp.ts`: eight lines, the desktop's clamp).
 * Not `UserMessageClamp` itself: that one fades into the user-bubble fill, and
 * this body sits on the page. Same geometry rule — clip from the first frame,
 * measure the unclipped inner view — so a long body never paints in full and
 * then snaps shut, and the measurement cannot feed back into itself.
 */
const BodyClamp = ({
	children,
	testID,
}: {
	children: React.ReactNode;
	testID?: string;
}) => {
	const [expanded, setExpanded] = useState(false);
	const [height, setHeight] = useState<number | null>(null);
	/* Show less sits at the END of an open body; collapsing removes everything
	 *  above the finger, so the list scrolls the body's top back into view —
	 *  the reader's own clamp's mechanism (`UserMessageClamp`), shared through
	 *  the list's context (design round 1, D2). */
	const keepInView = useContext(UserMessageCollapseContext);
	const ownRef = useRef<View | null>(null);
	const toggle = () => {
		const next = !expanded;
		setExpanded(next);
		if (!next && ownRef.current && keepInView) keepInView(ownRef.current);
	};
	const { effectiveScale } = useTextScale();
	const clamped =
		height !== null && needsUserMessageClamp(height, effectiveScale);
	const label = t(
		expanded
			? "mobile.team_bridge.card_body.show_less"
			: "mobile.team_bridge.card_body.show_more",
	);
	return (
		<>
			<View
				ref={ownRef}
				style={
					expanded
						? undefined
						: {
								maxHeight: userMessageClipHeight(effectiveScale),
								overflow: "hidden",
							}
				}
			>
				<View
					onLayout={(event: LayoutChangeEvent) =>
						setHeight(event.nativeEvent.layout.height)
					}
				>
					{children}
				</View>
			</View>
			{clamped ? (
				<Pressable
					testID={testID}
					accessibilityRole={ROLE.button}
					accessibilityLabel={label}
					accessibilityState={{ expanded }}
					/* react-native-web does not map `accessibilityState.expanded`
					 *  to the DOM; native does (QA round 1, Q1 / design D4). */
					aria-expanded={expanded}
					onPress={toggle}
					// Real geometry, not hitSlop: react-native-web drops hitSlop.
					style={{ minHeight: TOUCH_FLOOR }}
					className="justify-center"
				>
					<Text className="text-meta text-ink-muted">{label}</Text>
				</Pressable>
			) : null}
		</>
	);
};

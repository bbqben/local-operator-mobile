import { Pressable, Text, useWindowDimensions } from "react-native";

import { TRANSCRIPT_FADE_PT } from "@/features/session/transcript-presence";
import { t } from "@/i18n";
import { CONTROL, ROLE } from "@/ui/a11y";
import { TOUCH_FLOOR } from "@/ui/layout";

/**
 * "Jump to latest": the way back to the end that a reader who scrolled up is
 * offered INSTEAD of being yanked there (operator, 2026-11-21).
 *
 * It is an overlay, not a row: absolute inside the transcript's own viewport,
 * above the bottom edge fade's 24 pt band, so showing or hiding it never
 * changes the space the rows get. Its own box is the only thing it occupies —
 * no full-width rail — so nothing under or beside it loses a tap.
 *
 * Below 360 pt the readable label no longer fits beside a row's own text
 * without crowding it, so the visible label shortens to "Latest". The
 * ACCESSIBLE name is always the full sentence: a screen reader has no width.
 */

/** The width below which the full label gives way (the 320 pt phone class). */
export const JUMP_CHIP_NARROW_PT = 360;
/** Gap from the viewport edge; also the gap above the fade band. */
const CHIP_EDGE_PT = 8;

export const JumpToLatestChip = ({ onPress }: { onPress: () => void }) => {
	const narrow = useWindowDimensions().width < JUMP_CHIP_NARROW_PT;
	return (
		<Pressable
			accessibilityRole={ROLE.button}
			accessibilityLabel={t("mobile.session.jump_to_latest")}
			onPress={onPress}
			testID={CONTROL.transcriptJumpToLatest}
			className="absolute items-center justify-center rounded-full border border-border-control bg-elevated px-3"
			/* `end`, not `right`: the chip belongs on the reading order's trailing
			 * edge, and the physical-edge guard is what keeps that true in RTL. */
			style={{
				end: CHIP_EDGE_PT,
				bottom: TRANSCRIPT_FADE_PT + CHIP_EDGE_PT,
				minHeight: TOUCH_FLOOR,
			}}
		>
			<Text className="text-meta text-ink" numberOfLines={1}>
				{narrow
					? t("mobile.session.jump_to_latest_short")
					: t("mobile.session.jump_to_latest")}
			</Text>
		</Pressable>
	);
};

import * as Clipboard from "expo-clipboard";
import {
	memo,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	Platform,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useTextSelection } from "@/features/session/components/selectable-message";
import { GroupInsetContext } from "@/features/session/components/trace-rail";
import {
	type DiagramRequest,
	type DiagramResult,
	peekDiagram,
	renderDiagram,
} from "@/features/session/diagram-render";
import {
	DIAGRAM_FRAME_PAD,
	diagramInnerWidth,
	diagramLayout,
} from "@/features/session/diagram-source";
import { peleThemeVariables } from "@/features/session/diagram-theme";
import { NATIVE_MONO_FAMILY } from "@/features/session/mono-face";
import { t } from "@/i18n";
import { CONTROL, ROLE } from "@/ui/a11y";
import { useTheme } from "@/ui/appearance";
import { estimatedColumnWidth } from "@/ui/column";
import { LTR_TEXT } from "@/ui/direction";
import { TOUCH_FLOOR } from "@/ui/layout";
import { DiagramSvgView } from "./diagram-svg-view";

/**
 * A closed ```mermaid fence, drawn.
 *
 * The caller (`Markdown`) decides WHETHER a block is a diagram
 * (`isDiagramBlock`) and passes `fallback`, the ordinary code block for the same
 * lines. This component owns what to show instead of it:
 *
 *   - first frame, from the cache when the diagram was drawn before; otherwise
 *     the code block while Pele loads and renders (a few milliseconds, once);
 *   - `ok`: the diagram, in a frame, scaled to the column;
 *   - refused: the code block with the reason above it, in words and in colour
 *     (status is never colour alone) — the source stays readable and copyable.
 *
 * THEME. Colours are read from the app's role tokens through the active theme
 * entry and handed to Pele as concrete values, so a theme change (light, dark, any
 * custom palette) is a new request and a redraw, not a stale picture.
 *
 * GESTURES. The frame is one control: tap copies the diagram's source, the same
 * gesture as a code block, and a long press goes to the message's selection mode.
 * Inside it, a diagram wider than the column scrolls SIDEWAYS only, so a
 * one-finger vertical drag always scrolls the transcript. There is no pinch
 * viewer: this app has no zoom surface for an image either, and a new gesture
 * layer for one block type is not this change (see the pull request).
 */

const WEB = Platform.OS === "web";

/** Family names per target. Native: the platform sans (undefined, like the rest
 *  of the transcript's prose) and the bundled mono face. Web: the faces
 *  `theme.css` declares, by their CSS names. */
const FONTS = WEB
	? { sans: "Figtree", mono: "JetBrains Mono" }
	: { sans: undefined, mono: NATIVE_MONO_FAMILY };

/** Pele's variables from the ACTIVE theme's role values. `active` changes
 *  identity exactly when the palette does (mode, slot or system scheme), so the
 *  memo below is the theme-change trigger and nothing else is subscribed. */
const useDiagramTheme = (): Record<string, string> => {
	const { active } = useTheme();
	return useMemo(
		() => peleThemeVariables((role) => active.colors[role]),
		[active],
	);
};

function DiagramBlockView({
	source,
	language,
	fallback,
}: {
	source: string;
	language: string;
	fallback: ReactNode;
}) {
	const theme = useDiagramTheme();
	const viewport = useWindowDimensions();
	const groupInsetPt = useContext(GroupInsetContext);
	const [measured, setMeasured] = useState(0);
	const column =
		measured > 0
			? measured
			: Math.max(0, estimatedColumnWidth(viewport) - groupInsetPt);
	const inner = diagramInnerWidth(column);

	const request: DiagramRequest = useMemo(
		() => ({ source, width: inner, theme, fonts: FONTS }),
		[source, inner, theme],
	);
	const [settled, setSettled] = useState<{
		request: DiagramRequest;
		result: DiagramResult;
	} | null>(null);

	// A synchronous answer when this diagram was drawn before (a virtualised row
	// mounting again), so the first frame is the diagram and not the code block.
	const cached = peekDiagram(request);
	const current =
		cached ?? (settled && settled.request === request ? settled.result : null);

	useEffect(() => {
		if (cached) return;
		let live = true;
		renderDiagram(request).then((result) => {
			if (live) setSettled({ request, result });
		});
		return () => {
			live = false;
		};
	}, [request, cached]);

	const [copied, setCopied] = useState(false);
	const { enter } = useTextSelection();

	if (!current) return <>{fallback}</>;
	if (!current.ok) {
		return (
			<View className="gap-1">
				<Text className="text-meta text-danger" style={LTR_TEXT}>
					{t("mobile.session.diagram.error")}
					{current.message !== "" ? `\n${current.message}` : ""}
				</Text>
				{fallback}
			</View>
		);
	}

	const { prepared, type } = current;
	const layout = diagramLayout(prepared, inner);
	const label =
		prepared.label !== ""
			? t("mobile.session.diagram.label_titled", {
					type,
					title: prepared.label,
				})
			: t("mobile.session.diagram.label", { type });

	const drawing = (
		<View
			// The picture is one figure: its text is the source, which the control's
			// label and the copy action expose; drawing every `<text>` to a screen
			// reader would read the diagram out in paint order.
			aria-hidden
			style={{ width: layout.width, height: layout.height }}
		>
			<DiagramSvgView prepared={prepared} scale={layout.scale} />
		</View>
	);

	return (
		<Pressable
			accessibilityRole={ROLE.button}
			accessibilityLabel={label}
			accessibilityHint={t("mobile.session.diagram.copy_hint")}
			// Same floor reasoning as the code block: a short diagram is under 44 pt.
			style={{ minHeight: TOUCH_FLOOR }}
			testID={CONTROL.diagramCopy}
			onPress={() => {
				void Clipboard.setStringAsync(source).then(() => setCopied(true));
			}}
			onLongPress={enter}
			onLayout={(event) => {
				const width = Math.round(event.nativeEvent.layout.width);
				if (width > 0 && width !== measured) setMeasured(width);
			}}
		>
			<View className="overflow-hidden rounded-sm border border-hairline bg-surface">
				<Text className="border-b border-hairline px-2 py-1 text-meta text-ink-dim">
					{copied
						? `${language} · ${t("mobile.session.diagram.copied")}`
						: language}
				</Text>
				{layout.scrolls ? (
					<ScrollView
						horizontal
						// Sideways only: vertical drags fall through to the transcript.
						showsHorizontalScrollIndicator={false}
						nestedScrollEnabled
					>
						<View style={{ padding: DIAGRAM_FRAME_PAD }}>{drawing}</View>
					</ScrollView>
				) : (
					<View style={{ padding: DIAGRAM_FRAME_PAD, alignItems: "center" }}>
						{drawing}
					</View>
				)}
			</View>
		</Pressable>
	);
}

/** Memoised on the source: a closed fence above a growing tail must not redraw
 *  with every streamed token. `fallback` is rebuilt by the parent each frame, so
 *  it is deliberately not compared — it is a function of `source`/`language`. */
export const DiagramBlock = memo(
	DiagramBlockView,
	(before, after) =>
		before.source === after.source && before.language === after.language,
);

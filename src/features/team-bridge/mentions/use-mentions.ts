/**
 * State for the Team Bridge composer's @-mentions: the token map, the caret,
 * the one-shot selection, and the "not notified" notice. Every rule is in
 * `mention-state.ts`; this hook only holds the values between renders.
 *
 * TEXT OWNERSHIP. The thread screen keeps owning the draft (it persists it to
 * the per-conversation draft store and clears it after a send). This hook
 * takes the current text and the screen's setter, and routes every field edit
 * through `editDraft` first, so the token map can never disagree with the text
 * the field shows. Text the hook did not see (a restored draft, a clear after
 * send) is reconciled by `rebaseTokens` on the next render: a restored draft is
 * plain text with no structured mention, which is honest about what a send
 * will notify.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type {
	NativeSyntheticEvent,
	TextInputSelectionChangeEventData,
} from "react-native";
import { type MentionCandidateRow, notifiable } from "./candidates";
import type { MentionCandidate } from "./matcher";
import {
	editDraft,
	type MentionDraft,
	mentionView,
	nextDismissed,
	pickMention,
} from "./mention-state";
import { rebaseTokens } from "./tokens";

export type MentionNotice = {
	label: string;
	reason: "not_member" | "invited" | "no_endpoint";
};

export function useMentions(input: {
	text: string;
	setText: (next: string) => void;
	candidates: readonly MentionCandidateRow[];
	/** The organization directory has never answered (see `mentionView`). */
	directoryMissing: boolean;
}) {
	const { text, setText, candidates, directoryMissing } = input;
	const draft = useRef<MentionDraft>({
		text,
		tokens: [],
		caret: text.length,
		dismissedAt: null,
	});
	// A text change the hook did not make (restore, clear after send).
	if (draft.current.text !== text) {
		draft.current = {
			text,
			tokens: rebaseTokens(draft.current.text, text, draft.current.tokens),
			caret: text.length,
			dismissedAt: null,
		};
	}
	const [, rerender] = useState(0);
	const [selection, setSelection] = useState<number | null>(null);
	const [notice, setNotice] = useState<MentionNotice | null>(null);

	const commit = useCallback(
		(next: MentionDraft, oneShot: number | null) => {
			const dismissedAt = nextDismissed(next, candidates);
			draft.current = { ...next, dismissedAt };
			if (oneShot !== null) setSelection(oneShot);
			if (next.text !== text) setText(next.text);
			else rerender((n) => n + 1);
		},
		[candidates, setText, text],
	);

	const onChangeText = useCallback(
		(next: string) => {
			const result = editDraft(draft.current, next);
			commit(result, result.selection);
		},
		[commit],
	);

	const onSelectionChange = useCallback(
		(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
			const { end } = event.nativeEvent.selection;
			// The platform reported where the caret is: release the one-shot.
			if (selection !== null) setSelection(null);
			if (end === draft.current.caret) return;
			draft.current = { ...draft.current, caret: end };
			rerender((n) => n + 1);
		},
		[selection],
	);

	const view = mentionView(draft.current, candidates, directoryMissing);

	const pick = useCallback(
		(candidate: MentionCandidate) => {
			if (!view) return;
			const notify = notifiable(candidate);
			const result = pickMention(draft.current, view.query, candidate, notify);
			commit(result, result.selection);
			setNotice(
				notify
					? null
					: {
							label: candidate.label,
							reason: candidate.invited
								? "invited"
								: candidate.member
									? "no_endpoint"
									: "not_member",
						},
			);
		},
		[commit, view],
	);

	const dismissNotice = useCallback(() => setNotice(null), []);
	/*
	 * The notice explains ONE mention ("won't be notified"), so it lives as long
	 * as that mention does: deleting it, editing it into plain text, or the
	 * draft clearing after a send retires the notice with it.
	 */
	const liveNotice =
		notice &&
		draft.current.tokens.some(
			(token) => !token.notify && token.label === notice.label,
		)
			? notice
			: null;

	const selectionProp = useMemo(
		() =>
			selection === null ? undefined : { start: selection, end: selection },
		[selection],
	);

	return {
		/** The strip's content, or null when it is closed. */
		view,
		pick,
		onChangeText,
		onSelectionChange,
		/** Pass to the field: a one-shot caret placement, else undefined. */
		selection: selectionProp,
		/** The current token map, for `serializeMentions` at send. */
		tokens: draft.current.tokens,
		notice: liveNotice,
		dismissNotice,
	};
}

/**
 * Reply threads on Team Bridge: the pure rules the timeline row, the thread
 * screen, the store and the push tap share.
 *
 * NAMING. In this codebase "thread" already means one CONVERSATION's screen
 * (`thread-screen.tsx`, `ThreadData`, `threadKey`). A thread of REPLIES under
 * one root message is therefore a "reply thread" everywhere in code, so the two
 * never share an identifier. On screen it is simply "Thread", as on the desktop.
 *
 * THE PROJECTION RULE. Every number here is the hub's: `reply_count`,
 * `reply_participants` and `thread_unread_count` are computed server-side for
 * the reading account. Nothing in this module counts replies or subtracts a
 * read cursor; it only decides whether a served value is shown. That is what
 * keeps the phone's badge equal to the desktop's for the same reader.
 *
 * WHY A SEPARATE ROUTE AND NOT A SHEET. A push about a reply must open the
 * thread directly (cold start included), and a URL is the one destination both
 * a tap and a deep link already know how to reach (`push-payload.ts`).
 */

import type { Message, ReplyThreadPage } from "@/team-bridge/contract";

export interface ReplyThreadTarget {
	tenantId: string;
	conversationId: string;
	rootId: string;
}

/** What a root row shows. `unread` is null when the hub did not say. */
export interface ReplyThreadSummary {
	count: number;
	participants: string[];
	unread: number | null;
}

/**
 * The affordance a timeline row draws, or null for none.
 *
 * Null for a REPLY (it never roots a thread) and for a root the hub reports
 * with no replies or no rollup at all: an older hub sends none of these
 * fields, and "0 replies" is not something worth a control. An unread count
 * that is absent stays null, never 0 (absent means "cannot tell").
 */
export function replyThreadSummary(
	message: Pick<
		Message,
		| "thread_root_id"
		| "reply_count"
		| "reply_participants"
		| "thread_unread_count"
	>,
): ReplyThreadSummary | null {
	if (message.thread_root_id) return null;
	const count = message.reply_count;
	if (count === undefined || count <= 0) return null;
	return {
		count,
		participants: (message.reply_participants ?? [])
			.map((label) => label.trim())
			.filter((label) => label !== "")
			.slice(0, 3),
		unread: message.thread_unread_count ?? null,
	};
}

/** Whether the row's unread badge shows: only a served count above zero. */
export const showsThreadUnread = (
	summary: ReplyThreadSummary | null,
): boolean => summary !== null && summary.unread !== null && summary.unread > 0;

/**
 * Refuse a page that is not THIS thread rather than painting (or later
 * acknowledging) another conversation's replies under this header. The
 * desktop's `assertThreadPage`, kept identical: the root must be the
 * addressed root of this conversation and not itself a reply, and every reply
 * must belong to it.
 */
export function isReplyThreadPageFor(
	page: ReplyThreadPage,
	target: ReplyThreadTarget,
): boolean {
	return (
		page.root.id === target.rootId &&
		page.root.conversation_id === target.conversationId &&
		!page.root.thread_root_id &&
		page.replies.every(
			(reply) =>
				reply.conversation_id === target.conversationId &&
				reply.thread_root_id === target.rootId,
		)
	);
}

/**
 * The newest reply seq the reader has actually had on screen, from the rows
 * the list reports visible. A FETCHED page is not evidence of reading (the
 * desktop's `observeDisplayedThreadReplies` rule): only replies that were
 * displayed may advance the cursor, so a long thread opened at its top never
 * marks its unseen tail read. The root is not a reply and never counts.
 */
export function newestDisplayedReplySeq(
	visible: readonly Pick<Message, "seq" | "thread_root_id">[],
	rootId: string,
): number | null {
	let newest: number | null = null;
	for (const row of visible) {
		if (row.thread_root_id !== rootId) continue;
		if (newest === null || row.seq > newest) newest = row.seq;
	}
	return newest;
}

/**
 * Apply the hub's answer to a thread read onto the root it describes. The
 * count is TAKEN from the answer, never computed. An answer without a count
 * (a lenient parse of an odd body) leaves the root as it was; the next page or
 * timeline read restates it.
 */
export function rootAfterThreadRead<T extends Message>(
	root: T,
	answer: { thread_unread_count?: number; thread_last_read_seq?: number },
): T {
	if (answer.thread_unread_count === undefined) return root;
	if (
		answer.thread_last_read_seq !== undefined &&
		root.thread_last_read_seq !== undefined &&
		answer.thread_last_read_seq < root.thread_last_read_seq
	)
		// A slower, older answer must not resurrect a badge a newer read cleared.
		return root;
	if (
		root.thread_unread_count === answer.thread_unread_count &&
		root.thread_last_read_seq ===
			(answer.thread_last_read_seq ?? root.thread_last_read_seq)
	)
		return root;
	return {
		...root,
		thread_unread_count: answer.thread_unread_count,
		...(answer.thread_last_read_seq === undefined
			? {}
			: { thread_last_read_seq: answer.thread_last_read_seq }),
	};
}

/**
 * Replace a root the timeline already holds with the hub's newer copy (a
 * reply page carries the root with its fresh rollup). Only a HELD root is
 * replaced: inserting one the timeline never paged would open a hole in the
 * conversation's history. Returns `messages` itself when nothing changed, so a
 * store can skip publishing (the structural-sharing rule in `mergeMessages`).
 */
export function withRoot(
	messages: readonly Message[],
	root: Message,
	same: (a: Message, b: Message) => boolean,
): Message[] {
	const index = messages.findIndex((message) => message.id === root.id);
	if (index === -1) return messages as Message[];
	const held = messages[index] as Message;
	if (same(held, root)) return messages as Message[];
	const next = messages.slice();
	next[index] = root;
	return next;
}

/** The route a root row and a reply push open. */
export const replyThreadPath = (target: ReplyThreadTarget): string =>
	`/team-bridge/${encodeURIComponent(target.tenantId)}/${encodeURIComponent(target.conversationId)}/thread/${encodeURIComponent(target.rootId)}`;

export const replyThreadKey = (target: ReplyThreadTarget): string =>
	`${target.tenantId}/${target.conversationId}/${target.rootId}`;

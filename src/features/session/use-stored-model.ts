import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModelEntry } from "@/contracts";
import {
	effortAfterModelChange,
	effortOffer,
} from "@/features/home/picker-model";
import type { RelayEndpoints } from "@/relay";

export type StoredModelChoice = { model: ModelEntry; effort: string | null };

export const storedEfforts = (model: ModelEntry) => {
	const offer = effortOffer({
		supported: true,
		chosenModel: model,
		models: [model],
		catalogueDefault: undefined,
	});
	return offer.kind === "ladder" ? [...offer.rungs] : [];
};

/** The relay cannot set a cold runtime's model. Keep intent on the phone until an
 * explicit Resume/Send, then use the existing same-session protocol. In particular,
 * neither opening the picker nor choosing a row may spawn a process. A refusal
 * keeps the intent and never admits a prompt under the wrong model. */
export async function applyStoredModel(
	client: Pick<RelayEndpoints, "resumeSession" | "command">,
	sessionId: string,
	choice: StoredModelChoice,
	resume: boolean,
	assertCurrent: () => void = () => {},
) {
	if (choice.model.connected === false)
		throw new Error("model is not connected");
	if (
		choice.effort !== null &&
		!storedEfforts(choice.model).includes(choice.effort)
	)
		throw new Error("effort is not supported by the selected model");
	assertCurrent();
	if (resume) await client.resumeSession(sessionId);
	assertCurrent();
	await client.command(sessionId, {
		op: "set_model",
		provider: choice.model.provider,
		model_id: choice.model.model_id,
	});
	assertCurrent();
	if (choice.effort !== null)
		await client.command(sessionId, {
			op: "set_effort",
			effort: choice.effort,
		});
	assertCurrent();
}

export function useStoredModel(input: {
	client: RelayEndpoints | null;
	sessionId: string;
	/** Remote ownership/capabilities are enforced before enabling this path. */
	enabled: boolean;
	ended: boolean;
}) {
	const { client, sessionId, enabled, ended } = input;
	const owner = useMemo(() => ({ client, sessionId }), [client, sessionId]);
	const currentOwner = useRef<object | null>(owner);
	currentOwner.current = owner;
	useEffect(() => {
		currentOwner.current = owner;
		return () => {
			if (currentOwner.current === owner) currentOwner.current = null;
		};
	}, [owner]);
	const [choice, setChoice] = useState<{
		owner: object;
		value: StoredModelChoice;
	} | null>(null);
	const pending = choice?.owner === owner ? choice.value : null;
	const pendingRef = useRef(pending);
	pendingRef.current = pending;
	const [catalogue, setCatalogue] = useState<{
		owner: object;
		models: ModelEntry[];
		loading: boolean;
		failed: boolean;
	}>({ owner, models: [], loading: enabled, failed: false });
	const [epoch, retry] = useState(0);
	useEffect(() => {
		// Explicit retry invalidates only this catalogue read, never the runtime.
		void epoch;
		if (!enabled) return;
		if (!client) {
			setCatalogue({ owner, models: [], loading: false, failed: true });
			return;
		}
		let cancelled = false;
		setCatalogue((previous) => ({
			owner,
			models: previous.owner === owner ? previous.models : [],
			loading: true,
			failed: false,
		}));
		// /api/models belongs to the computer, not an attached session runtime.
		void client.models().then(
			(result) => {
				if (!cancelled)
					setCatalogue({
						owner,
						models: result.models,
						loading: false,
						failed: false,
					});
			},
			() => {
				if (!cancelled)
					setCatalogue((previous) => ({
						...previous,
						loading: false,
						failed: true,
					}));
			},
		);
		return () => {
			cancelled = true;
		};
	}, [client, owner, enabled, epoch]);
	const pick = useCallback(
		(model: ModelEntry, effort?: string | null) => {
			if (!enabled || model.connected === false) return;
			const offer = effortOffer({
				supported: true,
				chosenModel: model,
				models: [model],
				catalogueDefault: undefined,
			});
			const valid = effortAfterModelChange(
				effort === undefined ? (pendingRef.current?.effort ?? null) : effort,
				offer,
			);
			setChoice({ owner, value: { model, effort: valid } });
		},
		[enabled, owner],
	);
	// Header Resume and composer Send share preparation, including an ack that
	// arrives before React repaints. Otherwise two explicit actions can interleave
	// a late set_model with the first admitted prompt.
	const applying = useRef<{
		owner: object;
		choice: StoredModelChoice;
		promise: Promise<void>;
	} | null>(null);
	const prepare = useCallback(async () => {
		const captured = pendingRef.current;
		if (!captured) return;
		if (!client || currentOwner.current !== owner)
			throw new Error("session route changed");
		const existing = applying.current;
		if (existing?.owner === owner && existing.choice === captured)
			return existing.promise;
		const assertCurrent = () => {
			if (currentOwner.current !== owner)
				throw new Error("session route changed");
		};
		const promise = applyStoredModel(
			client,
			sessionId,
			captured,
			ended,
			assertCurrent,
		);
		applying.current = { owner, choice: captured, promise };
		try {
			await promise;
		} catch (error) {
			if (applying.current?.promise === promise) applying.current = null;
			throw error;
		}
		// A newer selection made during the request must survive the older ack.
		setChoice((previous) =>
			previous?.owner === owner && previous.value === captured
				? null
				: previous,
		);
	}, [client, sessionId, owner, ended]);
	const resume = useCallback(async () => {
		if (pendingRef.current) return prepare();
		if (!client || currentOwner.current !== owner)
			throw new Error("session route changed");
		await client.resumeSession(sessionId);
	}, [prepare, client, owner, sessionId]);
	return {
		resume,
		pending,
		pick,
		prepare,
		models: catalogue.owner === owner ? catalogue.models : [],
		loading: catalogue.owner !== owner || catalogue.loading,
		failed: catalogue.owner === owner && catalogue.failed,
		retry: () => retry((value) => value + 1),
	};
}

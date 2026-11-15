import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { useStore } from "zustand";

import {
	useConnection,
	useConnectionState,
	useLocaleFrame,
} from "@/features/auth/connection-provider";
import { t } from "@/i18n";
import type { RelayEndpoints } from "@/relay";
import { accountRoutingChoiceId, CONTROL, REGION } from "@/ui/a11y";
import { Button } from "@/ui/components/button";
import { SectionHeader } from "@/ui/components/section-header";
import { Segmented } from "@/ui/components/segmented";
import { createAccountRoutingEditor } from "./account-routing-state";

/** Capture the immutable selected-route client, not a dynamic relay() getter.
 * A client change creates unread state DURING render, rather than flashing the
 * old computer's value until an effect runs. Disconnect unmounts this editor,
 * so reconnecting with even the same client cannot reuse a saved confirmation.
 * Backend labels/help/choices/errors are TEXT; only our chrome is keyed here.
 * That chrome renders through `t()` (the active catalogue), NOT the English
 * `ACCOUNT_ROUTING_COPY` table: the table is the plain-`node` native proof's
 * English oracle, and rendering it here showed every locale English (M3 S5).
 * `t()` reads the locale per call; `AccountRoutingSection` subscribes to the
 * language frame so a switch while Settings is open repaints this copy without
 * depending on some unrelated state moving first.
 */
const AccountRoutingEditor = ({ client }: { client: RelayEndpoints }) => {
	const editor = useMemo(() => createAccountRoutingEditor(client), [client]);
	const { read, draft, save, saveError } = useStore(editor);
	useEffect(() => {
		void editor.activate();
		return () => editor.deactivate();
	}, [editor]);
	if (read.kind === "loading")
		return (
			<Text className="text-body-sm text-ink-muted">
				{t("mobile.account_routing.loading")}
			</Text>
		);
	if (read.kind !== "ready")
		return (
			<View className="gap-2">
				<Text className="text-body-sm text-ink-muted">
					{t(
						read.kind === "unsupported"
							? "mobile.account_routing.unavailable"
							: "mobile.account_routing.load_error",
					)}
				</Text>
				{read.serverText !== null ? (
					<Text className="text-body-sm text-ink-muted">{read.serverText}</Text>
				) : null}
				<Button
					testID={CONTROL.settingsAccountRoutingRetry}
					label={t("mobile.account_routing.retry")}
					variant="outline"
					size="sm"
					onPress={() => void editor.reload()}
				/>
			</View>
		);
	const row = read.payload.setting;
	const description = row.choices.find(
		(choice) => choice.value === draft,
	)?.description;
	return (
		<View className="gap-2">
			<Text className="text-label text-ink">{row.label}</Text>
			<Text className="text-body-sm text-ink-muted">{row.help}</Text>
			<Segmented
				label={row.label}
				testID={CONTROL.settingsAccountRoutingGroup}
				options={row.choices.map((choice) => ({
					value: choice.value,
					label: choice.label,
					// The id is BUILT by the contract, never spelled inline: a template
					// literal here is a second spelling of the family the a11y check
					// (and the flows) must agree on — see a11y.ts's builder.
					testID: accountRoutingChoiceId(choice.value),
				}))}
				value={draft}
				disabled={save === "pending"}
				onChange={editor.choose}
			/>
			{description ? (
				<Text className="text-body-sm text-ink-muted">{description}</Text>
			) : null}
			<Button
				testID={CONTROL.settingsAccountRoutingSave}
				label={t(
					save === "pending"
						? "mobile.account_routing.saving"
						: "mobile.account_routing.save",
				)}
				disabled={save === "pending" || draft === row.value}
				onPress={() => void editor.savePolicy()}
			/>
			{save === "saved" && draft === row.value ? (
				<Text
					accessibilityLiveRegion="polite"
					className="text-body-sm text-ink-muted"
				>
					{t("mobile.account_routing.saved")}
				</Text>
			) : null}
			{save === "idle" && draft !== row.value ? (
				<Text className="text-body-sm text-ink-muted">
					{t("mobile.account_routing.unsaved")}
				</Text>
			) : null}
			{save === "error" || save === "rejected" ? (
				<View className="gap-2">
					<Text
						accessibilityLiveRegion="polite"
						className="text-body-sm text-ink-muted"
					>
						{t(
							save === "rejected"
								? "mobile.account_routing.rejected"
								: "mobile.account_routing.error",
						)}
					</Text>
					{saveError !== null ? (
						<Text className="text-body-sm text-ink-muted">{saveError}</Text>
					) : null}
					<Button
						testID={CONTROL.settingsAccountRoutingRetry}
						label={t("mobile.account_routing.reload")}
						variant="outline"
						size="sm"
						onPress={() => void editor.reload()}
					/>
				</View>
			) : null}
		</View>
	);
};

/** The phone owns connection selection, never the computer's routing policy. */
export const AccountRoutingSection = () => {
	/* Subscription only (as `DirectionRoot`/`workspace-drawer` do): the frame
	 * re-renders this section and its editor child, whose `t()` calls then read
	 * the new locale. */
	useLocaleFrame();
	const { relay, streamHealth } = useConnection();
	const phase = useConnectionState((state) => state.phase);
	const route = useConnectionState((state) => state.route);
	const client =
		phase === "live" &&
		route !== null &&
		streamHealth !== "offline" &&
		streamHealth !== "degraded"
			? relay()
			: null;
	return (
		<View className="gap-2" testID={REGION.settingsAccountRouting}>
			<SectionHeader label={t("mobile.account_routing.title")} />
			<Text className="text-body-sm text-ink-muted">
				{t("mobile.account_routing.scope")}
			</Text>
			{client === null ? (
				<Text className="text-body-sm text-ink-muted">
					{t("mobile.account_routing.disconnected")}
				</Text>
			) : (
				<AccountRoutingEditor client={client} />
			)}
		</View>
	);
};

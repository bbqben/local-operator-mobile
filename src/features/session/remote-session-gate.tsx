import { useRouter } from "expo-router";
import { type ReactNode, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	useConnection,
	useConnectionState,
	useListState,
} from "@/features/auth/connection-provider";
import { remoteSessionsAvailable } from "@/features/sessions/session-navigation";
import { t } from "@/i18n";
import { isRelayError } from "@/relay";
import { Button } from "@/ui/components/button";

/** Fail closed before mounting session readers on an older relay. Once admitted,
 * keep the screen mounted through offline/permission/listing changes: throwing
 * it away would lose the loaded transcript and an unsent draft. No peer address
 * or owner identity from navigation is ever passed to the transport. */
export function RemoteSessionGate({
	remote,
	children,
}: {
	remote: boolean;
	children: ReactNode;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { refreshList } = useConnection();
	const capabilities = useListState((state) => state.capabilities);
	const liveFrameAt = useListState((state) => state.liveFrameAt);
	const connectionDetail = useConnectionState((state) => state.detail);
	const admitted = useRef(false);
	const [failure, setFailure] = useState<string | null>(null);
	const refresh = async () => {
		setFailure(null);
		try {
			await refreshList();
		} catch (error) {
			setFailure(
				isRelayError(error)
					? error.displayableMessage
					: t("mobile.remote_sessions.unreachable"),
			);
		}
	};
	if (remoteSessionsAvailable(capabilities)) admitted.current = true;
	if (!remote || admitted.current) return children;
	const pending = liveFrameAt === null;
	return (
		<View
			className="flex-1 bg-canvas px-4"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			testID="remote-session-unavailable"
		>
			<Button
				label={t("mobile.common.back")}
				variant="quiet"
				onPress={() => router.back()}
				testID="remote-session-back"
			/>
			<View className="flex-1 justify-center gap-4">
				<Text
					accessibilityRole="header"
					className="text-lg font-semibold text-ink"
				>
					{t("mobile.remote_sessions.title")}
				</Text>
				<Text className="text-body text-ink-muted">
					{failure ??
						connectionDetail ??
						t(
							pending
								? "mobile.remote_sessions.loading"
								: "mobile.remote_sessions.unsupported",
						)}
				</Text>
				<Button
					label={t("mobile.common.try_again")}
					onPress={() => {
						void refresh();
					}}
					testID="remote-session-retry"
				/>
			</View>
		</View>
	);
}

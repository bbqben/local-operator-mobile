import { Text, View } from "react-native";
import { t } from "@/i18n";
import { SURFACE } from "@/ui/a11y";

/** Shown only when the connected relay lacks owner-routed Highlight reads.
 * Retained attachments remain usable on that older remote-session baseline. */
export function RemoteFeatureNotice({ remote }: { remote: boolean }) {
	if (!remote) return null;
	return (
		<View className="px-4 py-2" testID={SURFACE.remoteRetainedOnlyNotice}>
			<Text className="text-body-sm text-ink-muted">
				{t("mobile.remote_sessions.retained_only")}
			</Text>
		</View>
	);
}

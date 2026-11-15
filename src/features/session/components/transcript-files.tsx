import { useState } from "react";
import { Platform, Text, View } from "react-native";
import type { TranscriptFileRef } from "@/contracts";
import {
	downloadRetainedFile,
	saveRetainedFile,
} from "@/features/session/retained-file";
import { t } from "@/i18n";
import { type ImageBytes, isRelayError } from "@/relay";
import { Button } from "@/ui/components/button";

export function TranscriptFiles({
	entryId,
	files,
	load,
}: {
	entryId: string;
	files: TranscriptFileRef[];
	load: (entry: string, index: number) => Promise<ImageBytes>;
}) {
	return (
		<View className="gap-2 px-4 pb-2">
			{files.map((file) => (
				<RetainedFileRow
					key={file.index}
					entryId={entryId}
					file={file}
					load={load}
				/>
			))}
		</View>
	);
}

function RetainedFileRow({
	entryId,
	file,
	load,
}: {
	entryId: string;
	file: TranscriptFileRef;
	load: (entry: string, index: number) => Promise<ImageBytes>;
}) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const save = async () => {
		if (saving) return;
		setSaving(true);
		setError(null);
		try {
			await downloadRetainedFile(load, entryId, file, (bytes, name, mime) =>
				saveRetainedFile(bytes, name, mime, Platform.OS),
			);
		} catch (cause) {
			setError(
				isRelayError(cause)
					? cause.displayableMessage
					: t("mobile.remote_sessions.file_save_failed"),
			);
		} finally {
			setSaving(false);
		}
	};
	return (
		<View
			className="gap-1 rounded-sm border border-hairline bg-elevated p-3"
			testID={`transcript-file-${entryId}-${file.index}`}
		>
			<Text className="text-body text-ink" numberOfLines={2}>
				{file.filename}
			</Text>
			<Text className="text-meta text-ink-dim">{file.mime_type}</Text>
			<Button
				label={
					saving
						? t("mobile.remote_sessions.file_saving")
						: t("mobile.common.save")
				}
				disabled={saving}
				variant="outline"
				testID={`transcript-file-save-${entryId}-${file.index}`}
				onPress={() => {
					void save();
				}}
			/>
			{error ? (
				<Text accessibilityRole="alert" className="text-body-sm text-danger">
					{error}
				</Text>
			) : null}
		</View>
	);
}

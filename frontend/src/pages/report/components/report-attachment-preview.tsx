import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportAttachment } from '../services/report-attachments';

function VideoPreview({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width, height, borderRadius: 8 }} />;
}

export function ReportAttachmentMedia({ attachment, width = 160, height = 120 }: { attachment: ReportAttachment; width?: number; height?: number }) {
  return attachment.kind === 'image'
    ? <Image source={{ uri: attachment.uri }} contentFit="cover" accessibilityLabel="Foto adjunta" style={{ width, height, borderRadius: 8 }} />
    : <VideoPreview uri={attachment.uri} width={width} height={height} />;
}

export function ReportAttachmentPreview({
  attachment,
  uploaded,
  disabled,
  onRemove,
}: {
  attachment: ReportAttachment;
  uploaded: boolean;
  disabled?: boolean;
  onRemove?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: 12, backgroundColor: theme.backgroundElement }}>
      <ReportAttachmentMedia attachment={attachment} />
      <ThemedText type="smallBold" selectable numberOfLines={2}>{attachment.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {(attachment.size / (1024 * 1024)).toFixed(1)} MiB · {uploaded ? 'Subido' : attachment.kind === 'video' ? 'Vídeo pendiente' : 'Foto pendiente'}
      </ThemedText>
      {onRemove && !disabled && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${attachment.name}`} onPress={onRemove}
          style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <ThemedText type="linkPrimary">Quitar</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

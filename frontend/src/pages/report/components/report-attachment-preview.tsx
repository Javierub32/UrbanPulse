import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportAttachment } from '../services/report-attachments';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: 160, height: 120, borderRadius: 8 }} />;
}

export function ReportAttachmentPreview({
  attachment,
  uploaded,
  disabled,
  onRemove,
}: {
  attachment: ReportAttachment;
  uploaded: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: 12, backgroundColor: theme.backgroundElement }}>
      {attachment.kind === 'image'
        ? <Image source={{ uri: attachment.uri }} contentFit="cover" style={{ width: 160, height: 120, borderRadius: 8 }} />
        : <VideoPreview uri={attachment.uri} />}
      <ThemedText type="smallBold" selectable numberOfLines={2}>{attachment.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {(attachment.size / (1024 * 1024)).toFixed(1)} MiB · {uploaded ? 'Subido' : attachment.kind === 'video' ? 'Vídeo pendiente' : 'Foto pendiente'}
      </ThemedText>
      {!disabled && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${attachment.name}`} onPress={onRemove}
          style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <ThemedText type="linkPrimary">Quitar</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { IncidentAttachment } from '@/types/incidents';
import { getAttachmentSource } from '../services/incident-detail-service';

type Props = { incidentId: string; attachment: IncidentAttachment; token: string };

function VideoMedia({ incidentId, attachment, token }: Props) {
  const source = getAttachmentSource(incidentId, attachment.id, token);
  const player = useVideoPlayer({ ...source, contentType: 'progressive', useCaching: false });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  if (status === 'error') {
    return <View style={{ gap: Spacing.two }}>
      <ThemedText accessibilityRole="alert">No se ha podido reproducir este vídeo.</ThemedText>
      <Pressable accessibilityRole="button" onPress={() => void player.replaceAsync(source)}
        style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <ThemedText type="linkPrimary">Reintentar vídeo</ThemedText>
      </Pressable>
    </View>;
  }
  return <VideoView player={player} nativeControls contentFit="contain"
    style={{ width: '100%', height: 220, borderRadius: 12 }} />;
}

export function IncidentAttachmentMedia(props: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (props.attachment.type === 'VIDEO') return <VideoMedia {...props} />;
  const source = getAttachmentSource(props.incidentId, props.attachment.id, props.token);
  return failed ? <View style={{ gap: Spacing.two }}>
    <ThemedText accessibilityRole="alert">No se ha podido cargar esta foto.</ThemedText>
    <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setAttempt(value => value + 1); }}
      style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <ThemedText type="linkPrimary">Reintentar foto</ThemedText>
    </Pressable>
  </View> : <Image key={attempt} source={source} cachePolicy="none" contentFit="contain"
    accessibilityLabel={`Foto adjunta: ${props.attachment.name}`} onError={() => setFailed(true)}
    style={{ width: '100%', height: 220, borderRadius: 12 }} />;
}

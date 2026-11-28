import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { IncidentAttachment } from '@/types/incidents';
import { getAttachmentBlob } from '../services/incident-detail-service';

type Props = { incidentId: string; attachment: IncidentAttachment; token: string; height: number };
type MediaState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; uri: string };

function VideoMedia({ uri, height }: { uri: string; height: number }) {
  const player = useVideoPlayer(uri);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  return status === 'error'
    ? <ThemedText accessibilityRole="alert">Este navegador no ha podido reproducir el vídeo.</ThemedText>
    : <VideoView player={player} nativeControls contentFit="contain"
        style={{ width: '100%', height, borderRadius: 8 }} />;
}

function MediaRequest({ incidentId, attachment, height, onRetry }: Props & { onRetry: () => void }) {
  const [state, setState] = useState<MediaState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    getAttachmentBlob(incidentId, attachment.id, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ status: 'ready', uri: objectUrl });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'No se ha podido cargar el archivo.' });
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [incidentId, attachment.id]);

  if (state.status === 'loading') return <View accessibilityRole="progressbar" accessibilityLabel="Cargando archivo"
    style={{ height, justifyContent: 'center' }}>
    <ActivityIndicator />
  </View>;
  if (state.status === 'error') return <View style={{ gap: Spacing.two }}>
    <ThemedText selectable accessibilityRole="alert">{state.message}</ThemedText>
    <Pressable accessibilityRole="button" onPress={onRetry}
      style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <ThemedText type="linkPrimary">Reintentar archivo</ThemedText>
    </Pressable>
  </View>;
  return attachment.type === 'PHOTO'
    ? <Image source={{ uri: state.uri }} contentFit="cover" cachePolicy="none"
        accessibilityLabel="Foto adjunta"
        onError={() => setState({ status: 'error', message: 'No se ha podido mostrar esta foto.' })}
        style={{ width: '100%', height, borderRadius: 8 }} />
    : <VideoMedia uri={state.uri} height={height} />;
}

export function IncidentAttachmentMedia(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <MediaRequest key={`${props.token}-${attempt}`} {...props} onRetry={() => setAttempt(value => value + 1)} />;
}

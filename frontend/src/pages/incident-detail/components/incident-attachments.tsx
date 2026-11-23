import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api-client';
import type { IncidentAttachment } from '@/types/incidents';
import { IncidentAttachmentMedia } from './incident-attachment-media';
import { getIncidentAttachments } from '../services/incident-detail-service';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: boolean }
  | { status: 'ready'; attachments: IncidentAttachment[] };

export function IncidentAttachments({ incidentId, token }: { incidentId: string; token: string }) {
  const theme = useTheme();
  const [attempt, setAttempt] = useState(0);
  const [openedVideos, setOpenedVideos] = useState<string[]>([]);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    // Mantiene el detalle visible mientras se recarga únicamente esta sección.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    getIncidentAttachments(incidentId, controller.signal).then(attachments => {
      if (!controller.signal.aborted) setState({ status: 'ready', attachments });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const status = error instanceof ApiError ? error.status : 0;
      setState({
        status: 'error',
        message: status === 403 || status === 404
          ? 'No tienes acceso a los adjuntos de esta incidencia.'
          : error instanceof Error ? error.message : 'No se han podido cargar los adjuntos.',
        retry: ![400, 403, 404].includes(status),
      });
    });
    return () => controller.abort();
  }, [incidentId, token, attempt]);

  return <View style={{ gap: Spacing.three }}>
    <ThemedText type="smallBold">Fotos y vídeos</ThemedText>
    {state.status === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando adjuntos"
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <ActivityIndicator /><ThemedText type="small" themeColor="textSecondary">Cargando adjuntos…</ThemedText>
    </View>}
    {state.status === 'error' && <View style={{ gap: Spacing.two }}>
      <ThemedText selectable accessibilityRole="alert">{state.message}</ThemedText>
      {state.retry && <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)}
        style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <ThemedText type="linkPrimary">Reintentar adjuntos</ThemedText>
      </Pressable>}
    </View>}
    {state.status === 'ready' && state.attachments.length === 0 &&
      <ThemedText type="small" themeColor="textSecondary">Esta incidencia no tiene archivos adjuntos.</ThemedText>}
    {state.status === 'ready' && state.attachments.map(attachment => {
      const opened = openedVideos.includes(attachment.id);
      return <View key={attachment.id} style={{ gap: Spacing.two, padding: Spacing.three,
        backgroundColor: theme.backgroundElement, borderRadius: 12, borderCurve: 'continuous' }}>
        <ThemedText selectable type="smallBold">{attachment.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {attachment.type === 'PHOTO' ? 'Foto' : 'Vídeo'} · {(attachment.size / (1024 * 1024)).toFixed(1)} MiB
        </ThemedText>
        {attachment.type === 'PHOTO' || opened
          ? <IncidentAttachmentMedia incidentId={incidentId} attachment={attachment} token={token} />
          : <Pressable accessibilityRole="button" accessibilityLabel={`Ver vídeo ${attachment.name}`}
              onPress={() => setOpenedVideos(current => [...current, attachment.id])}
              style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
              <ThemedText type="linkPrimary">Ver vídeo</ThemedText>
            </Pressable>}
        {attachment.type === 'VIDEO' && opened && <Pressable accessibilityRole="button"
          accessibilityLabel={`Cerrar vídeo ${attachment.name}`}
          onPress={() => setOpenedVideos(current => current.filter(id => id !== attachment.id))}
          style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <ThemedText type="linkPrimary">Cerrar vídeo</ThemedText>
        </Pressable>}
      </View>;
    })}
  </View>;
}

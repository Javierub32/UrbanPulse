import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { AttachmentCarousel } from '@/components/attachment-carousel';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api-client';
import type { IncidentAttachment } from '@/types/incidents';
import { IncidentAttachmentMedia } from './incident-attachment-media';
import { getAttachmentBlob, getAttachmentSource, getIncidentAttachments } from '../services/incident-detail-service';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: boolean }
  | { status: 'ready'; attachments: IncidentAttachment[] };

export function useIncidentAttachments(incidentId?: string, token?: string, showCover = true) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ incidentId: string; token: string; attempt: number; state: State }>();
  const state: State = result && result.incidentId === incidentId && result.token === token && result.attempt === attempt
    ? result.state : { status: 'loading' };

  useEffect(() => {
    if (!incidentId || !token) return;
    const controller = new AbortController();
    const update = (state: State) => setResult({ incidentId, token, attempt, state });
    getIncidentAttachments(incidentId, controller.signal).then(attachments => {
      if (!controller.signal.aborted) update({ status: 'ready', attachments });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const status = error instanceof ApiError ? error.status : 0;
      update({
        status: 'error',
        message: status === 403 || status === 404
          ? 'No tienes acceso a los adjuntos de esta incidencia.'
          : error instanceof Error ? error.message : 'No se han podido cargar los adjuntos.',
        retry: ![400, 403, 404].includes(status),
      });
    });
    return () => controller.abort();
  }, [incidentId, token, attempt]);

  const photoId = showCover && state.status === 'ready' ? state.attachments.find(attachment => attachment.type === 'PHOTO')?.id : undefined;
  const [webCover, setWebCover] = useState<{ incidentId: string; photoId: string; token: string; uri: string }>();

  useEffect(() => {
    if (Platform.OS !== 'web' || !incidentId || !photoId || !token) return;
    const controller = new AbortController();
    let uri: string | undefined;
    getAttachmentBlob(incidentId, photoId, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      uri = URL.createObjectURL(blob);
      setWebCover({ incidentId, photoId, token, uri });
    }).catch(() => {});
    return () => {
      controller.abort();
      if (uri) URL.revokeObjectURL(uri);
    };
  }, [incidentId, photoId, token]);

  const cover = incidentId && photoId && token
    ? Platform.OS !== 'web'
      ? getAttachmentSource(incidentId, photoId, token)
      : webCover && webCover.incidentId === incidentId && webCover.photoId === photoId && webCover.token === token
        ? { uri: webCover.uri } : undefined
    : undefined;
  let gallery: State | null = state;
  if (state.status === 'ready') {
    const remaining = state.attachments.filter(attachment => attachment.id !== photoId);
    gallery = remaining.length ? { status: 'ready', attachments: remaining } : null;
  }
  return { gallery, cover, retry: () => setAttempt(value => value + 1) };
}

export function IncidentAttachments({ incidentId, token, state, retry }: { incidentId: string; token: string; state: State; retry: () => void }) {
  return <View style={{ gap: Spacing.three }}>
    <ThemedText accessibilityRole="header" type="smallBold">Fotos y vídeos adjuntos</ThemedText>
    {state.status === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando adjuntos"
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <ActivityIndicator /><ThemedText type="small" themeColor="textSecondary">Cargando adjuntos…</ThemedText>
    </View>}
    {state.status === 'error' && <View style={{ gap: Spacing.two }}>
      <ThemedText selectable accessibilityRole="alert">{state.message}</ThemedText>
      {state.retry && <Pressable accessibilityRole="button" onPress={retry}
        style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <ThemedText type="linkPrimary">Reintentar adjuntos</ThemedText>
      </Pressable>}
    </View>}
    {state.status === 'ready' && <AttachmentCarousel>
      {({ width, height }) => state.attachments.map(attachment =>
        <View key={attachment.id} style={{ width, minHeight: height }}>
          <IncidentAttachmentMedia incidentId={incidentId} attachment={attachment} token={token} height={height} />
        </View>)}
    </AttachmentCarousel>}
  </View>;
}

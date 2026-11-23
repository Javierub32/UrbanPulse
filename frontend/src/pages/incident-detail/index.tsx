import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';
import { ApiError } from '@/services/api-client';
import type { IncidentDetail } from '@/types/incidents';
import { IncidentAttachments } from './components/incident-attachments';
import { getIncidentDetail } from './services/incident-detail-service';
import { useAuth } from '@/context/AuthContext';
import { ReviewActions } from './components/review-actions';

type State = { status: 'loading' } | { status: 'error'; message: string; retry: boolean } | { status: 'success'; data: IncidentDetail };
const statuses: Record<string, string> = { REPORTED: 'Comunicada', VALIDATED: 'Validada', REJECTED: 'Rechazada', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta', REOPENED: 'Reabierta', CLOSED: 'Cerrada' };
const priorities: Record<string, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' };
const atmosphericLabels: Record<string, string> = { precipitation: 'Precipitación', pm2_5: 'Partículas PM2.5', pm10: 'Partículas PM10', nitrogen_dioxide: 'Dióxido de nitrógeno' };
const label = (value: string | null, labels: Record<string, string>) => value ? (labels[value] ?? value) : 'No disponible';
const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const date = (value: string | null) => parseDate(value)?.toLocaleString('es-ES') ?? 'No disponible';
const incidentDate = (value: string | null) => parseDate(value)?.toLocaleDateString('es-ES') ?? 'No disponible';
const incidentTime = (value: string | null) => parseDate(value)?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? 'No disponible';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IncidentDetailContent key={id} id={id} />;
}

function IncidentDetailContent({ id }: { id: string }) {
  const theme = useTheme();
  const { session } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // La recarga necesita retirar el contenido anterior mientras se consulta el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    if (!id || Array.isArray(id)) {
      setState({ status: 'error', message: 'Identificador de incidencia no válido.', retry: false });
      return () => { active = false; controller.abort(); };
    }
    getIncidentDetail(id, controller.signal).then(data => {
      if (active) setState({ status: 'success', data });
    }).catch((error: unknown) => {
      if (!active) return;
      const status = error instanceof ApiError ? error.status : 0;
      const message = status === 404 ? 'No se ha encontrado la incidencia.'
        : status === 403 ? 'No tienes permiso para consultar esta incidencia.'
          : status === 400 ? 'Identificador de incidencia no válido.'
            : error instanceof Error ? error.message : 'No se ha podido cargar la incidencia.';
      setState({ status: 'error', message, retry: ![400, 403, 404].includes(status) });
    });
    return () => { active = false; controller.abort(); };
  }, [id, attempt]);

  const field = (name: string, value: string, key?: string) => <View key={key} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}><ThemedText type="small" themeColor="textSecondary">{name}</ThemedText><ThemedText type="smallBold" selectable style={{ flexShrink: 1, textAlign: 'right' }}>{value}</ThemedText></View>;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four }}>
    {state.status === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencia"><ActivityIndicator /><ThemedText>Cargando incidencia…</ThemedText></View>}
    {state.status === 'error' && <View style={{ gap: Spacing.two }}><ThemedText selectable accessibilityRole="alert">{state.message}</ThemedText>{state.retry && <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable>}</View>}
    {state.status === 'success' && <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center', gap: Spacing.four }}>
      {session?.user.role === 'OPERATOR' && state.data.status === 'REPORTED' && <ReviewActions incident={state.data} onDone={retry} />}
      <View style={{ gap: Spacing.two }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: theme.backgroundElement, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one }}><ThemedText type="smallBold" style={{ color: theme.accent }}>{label(state.data.status, statuses)}</ThemedText></View>
        <ThemedText type="subtitle" selectable>{state.data.title || 'Incidencia sin título'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{categories.find(item => item.value === state.data.category)?.label ?? state.data.category ?? 'Categoría no disponible'}</ThemedText>
      </View>
      {session?.accessToken && <IncidentAttachments key={`${id}:${session.accessToken}`}
        incidentId={id} token={session.accessToken} />}
      <View style={{ gap: Spacing.two }}><ThemedText type="smallBold">Descripción</ThemedText><ThemedText selectable>{state.data.description || 'No disponible'}</ThemedText></View>
      <View style={{ gap: Spacing.two }}><ThemedText type="smallBold">Información</ThemedText>
        {field('Prioridad', label(state.data.priority, priorities))}
        {field('Fecha de la incidencia', incidentDate(state.data.registeredAt))}
        {field('Hora de la incidencia', incidentTime(state.data.registeredAt))}
        {field('Actualizada', date(state.data.updatedAt))}
        {field('Calle', state.data.normalizedAddress || 'No disponible')}
        {field('Coordenadas', state.data.latitude != null && state.data.longitude != null ? `${state.data.latitude}, ${state.data.longitude}` : 'No disponible')}
      </View>
      <View style={{ gap: Spacing.two }}><ThemedText type="smallBold">Datos atmosféricos</ThemedText>
        {(state.data.atmosphericData ?? []).length === 0
          ? <ThemedText themeColor="textSecondary">No hay datos atmosféricos disponibles para esta incidencia.</ThemedText>
          : <>
              {state.data.atmosphericData.map((reading, index) => field(
                atmosphericLabels[reading.key] ?? reading.key,
                `${reading.value} ${reading.unit}`,
                `${reading.key}-${reading.source}-${index}`,
              ))}
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, lineHeight: 14, textAlign: 'right' }}>
                {state.data.atmosphericData.some(reading => reading.source.includes('CAMS ENSEMBLE'))
                  ? 'Fuente: Open-Meteo · Calidad del aire: CAMS ENSEMBLE'
                  : 'Fuente: Open-Meteo'}
              </ThemedText>
            </>}
      </View>
      <View style={{ gap: Spacing.three }}><ThemedText type="smallBold">Historial</ThemedText>
        {state.data.history.length === 0 ? <ThemedText themeColor="textSecondary">No hay actividad registrada.</ThemedText> : state.data.history.map((entry, index) => <View key={`${entry.changedAt}-${index}`} style={{ flexDirection: 'row', gap: Spacing.three }}><View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 7, backgroundColor: theme.accent }} /><View style={{ flex: 1, gap: Spacing.one }}><ThemedText>{entry.action === 'INCIDENT_EDITED' ? 'Información de la incidencia editada' : entry.action === 'INFORMATION_REQUESTED' ? 'Información adicional solicitada' : `${entry.previousStatus ? `${label(entry.previousStatus, statuses)} → ` : ''}${label(entry.status, statuses)}`}</ThemedText>{entry.reason && <ThemedText>{entry.action === 'INCIDENT_EDITED' ? `Campos modificados: ${entry.reason}` : entry.reason}</ThemedText>}{session?.user.role === 'OPERATOR' && (entry.actorName || entry.actorId) && <ThemedText type="small" themeColor="textSecondary">Realizado por: {entry.actorName || entry.actorId}</ThemedText>}<ThemedText type="small" themeColor="textSecondary">{date(entry.changedAt)}</ThemedText></View></View>)}
      </View>
    </View>}
  </ScrollView>;
}

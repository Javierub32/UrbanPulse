import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getIncidentDetail } from '@/pages/incident-detail/services/incident-detail-service';
import { categories } from '@/pages/report/services/report-service';
import { ApiError } from '@/services/api-client';
import type { IncidentDetail } from '@/types/incidents';
import { relativeTime } from './analytics';
import { incidentStatus, incidentStatusTone } from './incident-status';
import { Reveal, Skeleton } from './motion';
import { reviewHistoryLabel } from '@/pages/incident-detail/review-history';
import { submitReview, type ReviewCommand } from './review-service';
import { StatusPill } from './status-pill';
import { useAdminTheme } from './theme';

type State = { status: 'loading' } | { status: 'error'; message: string; retry: boolean } | { status: 'success'; data: IncidentDetail };
type Theme = ReturnType<typeof useAdminTheme>;

const priorities = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];
const atmosphericLabels: Record<string, string> = { precipitation: 'Precipitación', pm2_5: 'Partículas PM2.5', pm10: 'Partículas PM10', nitrogen_dioxide: 'Dióxido de nitrógeno' };
const confirmations: Record<ReviewCommand['action'], string> = {
  edit: 'Cambios guardados.',
  'request-information': 'Solicitud de información registrada.',
  reject: 'Incidencia rechazada.',
  validate: 'Incidencia validada.',
};

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const formatDate = (value: string | null) => parseDate(value)?.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) ?? 'No disponible';
const categoryLabel = (value: string | null) => categories.find((item) => item.value === value)?.label ?? value ?? 'Sin categoría';
const priorityLabel = (value: string | null) => priorities.find((item) => item.value === value)?.label ?? value ?? 'Sin prioridad';

function historyLabel(entry: IncidentDetail['history'][number]) {
  const review = reviewHistoryLabel(entry.action);
  if (review) return review;
  return entry.previousStatus ? `${incidentStatus(entry.previousStatus)} → ${incidentStatus(entry.status)}` : incidentStatus(entry.status);
}

export default function AdminIncidentDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  return <AdminIncidentDetail key={id} id={id} from={from === 'map' ? 'map' : 'incidents'} />;
}

function AdminIncidentDetail({ id, from }: { id: string; from: 'map' | 'incidents' }) {
  const theme = useAdminTheme();
  const router = useRouter();
  // Vuelve a la pantalla de origen; si se entró por enlace directo, a la sección de la que procede.
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(from === 'map' ? '/operator/map' : '/operator/incidents');
  };
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [notice, setNotice] = useState('');
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!id || Array.isArray(id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'error', message: 'Identificador de incidencia no válido.', retry: false });
      return () => controller.abort();
    }
    getIncidentDetail(id, controller.signal).then((data) => {
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

  const onReviewed = useCallback((message: string) => { setNotice(message); reload(); }, [reload]);

  return (
    <View nativeID="admin-canvas" style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ width: '100%', maxWidth: 1180, alignSelf: 'center', padding: 42, paddingTop: 30, paddingBottom: 64, gap: 22 }} keyboardShouldPersistTaps="handled">
        <Pressable nativeID="admin-detail-back" accessibilityRole="button" onPress={back} style={{ alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>{from === 'map' ? '← Mapa' : '← Incidencias'}</Text>
        </Pressable>

        {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: theme.success, fontWeight: '700' }}>{notice}</Text>}

        {state.status === 'loading' && (
          <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencia" style={{ gap: 14 }}>
            <Skeleton style={{ height: 44, width: 420, borderRadius: 12 }} />
            <Skeleton style={{ height: 280, borderRadius: 20 }} />
          </View>
        )}

        {state.status === 'error' && (
          <Card id="admin-card-detail-error">
            <Text accessibilityRole="alert" style={{ color: theme.text, fontWeight: '700' }}>{state.message}</Text>
            {state.retry && <Pressable accessibilityRole="button" onPress={reload} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.accent, fontWeight: '700' }}>Reintentar</Text></Pressable>}
          </Card>
        )}

        {state.status === 'success' && (
          <>
            <Reveal index={0}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <StatusPill status={state.data.status} />
                  <Text style={{ color: theme.muted, fontSize: 13 }}>{categoryLabel(state.data.category)} · {relativeTime(state.data.registeredAt)}</Text>
                </View>
                <Text selectable style={{ color: theme.text, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 }}>{state.data.title?.trim() || 'Incidencia sin título'}</Text>
              </View>
            </Reveal>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
              <View style={{ flexGrow: 1.6, flexBasis: 460, minWidth: 0, gap: 22 }}>
                <Reveal index={1}>
                  <Card id="admin-card-description" title="Descripción">
                    <Text selectable style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{state.data.description?.trim() || 'Sin descripción.'}</Text>
                  </Card>
                </Reveal>
                <Reveal index={2}>
                  <Card id="admin-card-information" title="Información">
                    <Field theme={theme} name="Prioridad" value={priorityLabel(state.data.priority)} />
                    <Field theme={theme} name="Registrada" value={formatDate(state.data.registeredAt)} />
                    <Field theme={theme} name="Actualizada" value={formatDate(state.data.updatedAt)} />
                    <Field theme={theme} name="Calle" value={state.data.normalizedAddress || 'No disponible'} />
                    <Field theme={theme} name="Coordenadas" value={state.data.latitude != null && state.data.longitude != null ? `${state.data.latitude}, ${state.data.longitude}` : 'No disponible'} last />
                  </Card>
                </Reveal>
                <Reveal index={3}>
                  <Card id="admin-card-atmospheric" title="Datos atmosféricos">
                    {(state.data.atmosphericData ?? []).length === 0
                      ? <Text style={{ color: theme.muted }}>No hay datos atmosféricos para esta incidencia.</Text>
                      : <>
                          {state.data.atmosphericData.map((reading, index) => (
                            <Field key={`${reading.key}-${reading.source}-${index}`} theme={theme} name={atmosphericLabels[reading.key] ?? reading.key} value={`${reading.value} ${reading.unit}`} last={index === state.data.atmosphericData.length - 1} />
                          ))}
                          <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'right' }}>
                            {state.data.atmosphericData.some((reading) => reading.source.includes('CAMS ENSEMBLE')) ? 'Fuente: Open-Meteo · Calidad del aire: CAMS ENSEMBLE' : 'Fuente: Open-Meteo'}
                          </Text>
                        </>}
                  </Card>
                </Reveal>
              </View>

              <View style={{ flexGrow: 1, flexBasis: 340, minWidth: 0, gap: 22 }}>
                {state.data.status === 'REPORTED' && (
                  <Reveal index={1}>
                    <ReviewCard key={state.data.updatedAt ?? ''} incident={state.data} onReviewed={onReviewed} onError={() => setNotice('')} />
                  </Reveal>
                )}
                <Reveal index={2}>
                  <Card id="admin-card-history" title="Historial">
                    {state.data.history.length === 0
                      ? <Text style={{ color: theme.muted }}>Todavía no hay historial registrado.</Text>
                      : state.data.history.map((entry, index) => (
                          <View key={`${entry.changedAt}-${index}`} style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ alignItems: 'center' }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: theme[incidentStatusTone(entry.status)] }} />
                              {index < state.data.history.length - 1 && <View style={{ flex: 1, width: 2, marginTop: 4, backgroundColor: theme.border }} />}
                            </View>
                            <View style={{ flex: 1, gap: 3, paddingBottom: 14 }}>
                              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{historyLabel(entry)}</Text>
                              {!!entry.reason && <Text selectable style={{ color: theme.text, fontSize: 13 }}>{entry.action === 'INCIDENT_EDITED' ? `Campos modificados: ${entry.reason}` : entry.reason}</Text>}
                              {!!(entry.actorName || entry.actorId) && <Text style={{ color: theme.muted, fontSize: 12 }}>Realizado por: {entry.actorName || entry.actorId}</Text>}
                              <Text style={{ color: theme.muted, fontSize: 12 }}>{formatDate(entry.changedAt)}</Text>
                            </View>
                          </View>
                        ))}
                  </Card>
                </Reveal>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  const theme = useAdminTheme();
  return (
    <View nativeID={id} style={{ backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, gap: 14 }}>
      {!!title && <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>}
      {children}
    </View>
  );
}

function Field({ theme, name, value, last }: { theme: Theme; name: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingBottom: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{name}</Text>
      <Text selectable style={{ color: theme.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function Choices({ label, options, value, onChange, disabled }: { label: string; options: readonly { value: string; label: string }[]; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const theme = useAdminTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable key={option.value} nativeID={`admin-option-${label}-${option.value}`} accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(option.value)} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: selected ? theme.accent : theme.surface, borderWidth: 1, borderColor: selected ? theme.accent : theme.border }}>
              <Text style={{ color: selected ? theme.background : theme.text, fontSize: 12, fontWeight: '700' }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReviewCard({ incident, onReviewed, onError }: { incident: IncidentDetail; onReviewed: (message: string) => void; onError: () => void }) {
  const theme = useAdminTheme();
  const [category, setCategory] = useState(incident.category ?? '');
  const [priority, setPriority] = useState(incident.priority ?? '');
  const [latitude, setLatitude] = useState(String(incident.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(incident.longitude ?? ''));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<ReviewCommand['action'] | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const fail = (message: string) => { setError(message); onError(); };

  const send = async (command: ReviewCommand) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(command.action);
    setError('');
    try {
      await submitReview(incident.id, command);
      onReviewed(confirmations[command.action]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) onReviewed(cause.message);
      else {
        const details = cause instanceof ApiError ? Object.values(cause.fields) : [];
        fail(details.length ? details.join(' ') : cause instanceof Error ? cause.message : 'No se ha podido completar la acción.');
      }
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const save = () => {
    const lat = Number(latitude.trim().replace(',', '.'));
    const lon = Number(longitude.trim().replace(',', '.'));
    if (!category || !priority) return fail('Selecciona la categoría y la prioridad.');
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return fail('Introduce una latitud entre −90 y 90 y una longitud entre −180 y 180.');
    }
    void send({ action: 'edit', body: { category, priority, latitude: lat, longitude: lon } });
  };

  const withReason = (action: 'request-information' | 'reject') => {
    const text = reason.trim();
    if (!text) return fail('Introduce un motivo.');
    void send({ action, body: { reason: text } });
  };

  const input = { minHeight: 40, paddingHorizontal: 14, borderRadius: 12, color: theme.text, fontSize: 14, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border };

  return (
    <Card id="admin-card-review" title="Revisión inicial">
      <Text style={{ color: theme.muted, fontSize: 13 }}>Corrige los datos si hace falta y decide si la incidencia sigue adelante.</Text>
      <Choices label="Categoría" options={categories} value={category} onChange={setCategory} disabled={!!busy} />
      <Choices label="Prioridad" options={priorities} value={priority} onChange={setPriority} disabled={!!busy} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {([['Latitud', latitude, setLatitude], ['Longitud', longitude, setLongitude]] as const).map(([name, value, set]) => (
          <View key={name} style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{name}</Text>
            <TextInput accessibilityLabel={name} inputMode="decimal" editable={!busy} value={value} onChangeText={set} style={input} />
          </View>
        ))}
      </View>
      <ReviewButton action="edit" label="Guardar cambios" busy={busy} onPress={save} />
      <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 4 }} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Motivo del rechazo o de la solicitud</Text>
        <TextInput accessibilityLabel="Motivo del rechazo o de la solicitud" editable={!busy} multiline maxLength={2000} value={reason} onChangeText={setReason} style={[input, { minHeight: 88, paddingVertical: 10, textAlignVertical: 'top' }]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ReviewButton action="request-information" label="Solicitar información" busy={busy} onPress={() => withReason('request-information')} />
        <ReviewButton action="reject" label="Rechazar" busy={busy} onPress={() => withReason('reject')} />
      </View>
      <ReviewButton action="validate" label="Validar incidencia" busy={busy} onPress={() => void send({ action: 'validate' })} />
      {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: theme.danger, fontWeight: '600' }}>{error}</Text>}
    </Card>
  );
}

function ReviewButton({ action, label, busy, onPress }: { action: ReviewCommand['action']; label: string; busy: ReviewCommand['action'] | null; onPress: () => void }) {
  const theme = useAdminTheme();
  const primary = action === 'validate';
  const color = primary ? theme.background : action === 'reject' ? theme.danger : theme.accent;
  return (
    <Pressable
      nativeID={`admin-review-${action}`}
      accessibilityRole="button"
      accessibilityState={{ busy: busy === action, disabled: !!busy }}
      disabled={!!busy}
      onPress={onPress}
      style={({ pressed }) => ({ flexGrow: 1, minHeight: 42, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: primary ? theme.accent : theme.surface, borderWidth: 1, borderColor: primary ? theme.accent : action === 'reject' ? `${theme.danger}55` : theme.border, opacity: pressed || (busy && busy !== action) ? 0.55 : 1 })}
    >
      {busy === action && <ActivityIndicator color={color} />}
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

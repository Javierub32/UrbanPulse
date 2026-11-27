import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Armchair, ArrowDown, ArrowLeft, Brush, CircleAlert, Flag, Lightbulb, MapPin, Minus, Route, Shapes, TrafficCone, Trash2, Trees, TriangleAlert, UserRound } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { GlassSurface } from '@/components/glass-surface';
import { TicketPhoto } from '@/components/incident-ticket';
import { reviewHistoryLabel } from '@/pages/incident-detail/review-history';
import { TicketDetail } from '@/pages/incidents/components/ticket-stack';
import { parseDate } from '@/pages/incidents/incident-filters';
import LocationMap from '@/pages/report/components/location-map';
import { categories } from '@/pages/report/services/report-service';
import type { IncidentDetail } from '@/types/incidents';

import { ADMIN_COMPACT_SIDEBAR_INSET } from './admin-shell';
import { GlassFilterMenu, type GlassFilterOption } from './glass-filter-menu';
import { incidentStatus, incidentStatusTone } from './incident-status';
import { Reveal, Skeleton } from './motion';
import { getAssignmentCatalog, type AssignmentCatalogOption, type AssignmentDestination, type ReviewCommand } from './review-service';
import { StatusPill } from './status-pill';
import { useAdminTheme } from './theme';
import { useIncidentReview } from './use-incident-review';

const CONTENT_MAX_WIDTH = 1460;
const MODULE_GAP = 20;
const HISTORY_WIDTH = 272;
const LOCATION_WIDTH = 234;
const MODULE_ENTER_DURATION = 880;

const priorities = [
  { value: 'LOW', label: 'Baja', icon: ArrowDown, tone: 'success' },
  { value: 'MEDIUM', label: 'Media', icon: Minus, tone: 'accent' },
  { value: 'HIGH', label: 'Alta', icon: TriangleAlert, tone: 'warning' },
  { value: 'CRITICAL', label: 'Crítica', icon: CircleAlert, tone: 'danger' },
] as const;
const categoryIcons = {
  PUBLIC_ROAD: Route,
  STREET_LIGHTING: Lightbulb,
  TRAFFIC: TrafficCone,
  GREEN_AREAS: Trees,
  CLEANING: Brush,
  WASTE: Trash2,
  STREET_FURNITURE: Armchair,
  OTHER: Shapes,
};
const categoryOptions = categories.map((option) => ({ ...option, icon: categoryIcons[option.value] }));

type EditField = 'category' | 'priority' | 'location';
type Draft = { category: string; priority: string; latitude: string; longitude: string };
type ReasonAction = 'reject' | 'request-information';
type Editor =
  | { kind: 'fields'; field: EditField; values: Draft; manualLocation?: boolean; error?: string }
  | { kind: 'reason'; action: ReasonAction; reason: string; error?: string };

const formatDate = (value: string | null) => parseDate(value)?.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) ?? 'No disponible';

function draftFrom(incident: IncidentDetail): Draft {
  return {
    category: incident.category ?? '',
    priority: incident.priority ?? '',
    latitude: incident.latitude == null ? '' : String(incident.latitude),
    longitude: incident.longitude == null ? '' : String(incident.longitude),
  };
}

function coordinates(latitude: string, longitude: string) {
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude.trim().replace(',', '.'));
  const lon = Number(longitude.trim().replace(',', '.'));
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180
    ? { latitude: lat, longitude: lon }
    : null;
}

export default function AdminIncidentDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const incidentId = typeof id === 'string' && id ? id : undefined;
  return <AdminIncidentDetail key={incidentId ?? 'missing'} id={incidentId} fromMap={from === 'map'} />;
}

function AdminIncidentDetail({ id, fromMap }: { id?: string; fromMap: boolean }) {
  const theme = useAdminTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const review = useIncidentReview(id);
  const { incident, busy, locked, loading, readError, notice, actionError } = review;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [openMenu, setOpenMenu] = useState<Exclude<EditField, 'location'> | null>(null);
  const fieldEditor = editor?.kind === 'fields' ? editor : null;
  const reasonEditor = editor?.kind === 'reason' ? editor : null;
  const padding = width < 660 ? 14 : width < 1100 ? 24 : 34;
  const contentWidth = Math.min(CONTENT_MAX_WIDTH, width - ADMIN_COMPACT_SIDEBAR_INSET) - padding * 2;
  const historyAside = contentWidth >= 1000;
  const mainWidth = contentWidth - (historyAside ? HISTORY_WIDTH + MODULE_GAP : 0);
  const locationAside = mainWidth >= 680;
  const overviewWidth = mainWidth - (locationAside ? LOCATION_WIDTH + MODULE_GAP : 0);
  const photoAside = overviewWidth >= 420;
  const ticketAside = mainWidth >= 618;
  const showFields = review.reviewable && !reasonEditor;
  const canEdit = showFields && !locked;
  const savedLatitude = incident?.latitude;
  const savedLongitude = incident?.longitude;
  const draftLatitude = fieldEditor?.values.latitude;
  const draftLongitude = fieldEditor?.values.longitude;
  const point = useMemo(() => coordinates(draftLatitude ?? '', draftLongitude ?? '')
    ?? (savedLatitude != null && savedLongitude != null ? { latitude: savedLatitude, longitude: savedLongitude } : null),
  [draftLatitude, draftLongitude, savedLatitude, savedLongitude]);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(fromMap ? '/operator/map' : '/operator/incidents');
  }

  function openField(field: EditField, patch?: Partial<Draft>) {
    if (!incident || !canEdit) return;
    review.clearFeedback();
    setEditor({
      kind: 'fields',
      field,
      values: { ...(fieldEditor?.values ?? draftFrom(incident)), ...patch },
      manualLocation: field === 'location' && (!patch || fieldEditor?.manualLocation),
    });
  }

  function patchDraft(patch: Partial<Draft>) {
    setEditor((current) => current?.kind === 'fields'
      ? { ...current, error: undefined, values: { ...current.values, ...patch } }
      : current);
  }

  function cancelEditor() {
    setEditor(null);
    review.clearFeedback();
  }

  async function submit(command: ReviewCommand) {
    if (await review.submit(command)) setEditor(null);
  }

  function saveFields() {
    if (!fieldEditor) return;
    const { values } = fieldEditor;
    const point = coordinates(values.latitude, values.longitude);
    if (!values.category) {
      setEditor({ ...fieldEditor, field: 'category', error: 'Selecciona una categoría para guardar.' });
    } else if (!values.priority) {
      setEditor({ ...fieldEditor, field: 'priority', error: 'Selecciona una prioridad para guardar.' });
    } else if (!point) {
      setEditor({ ...fieldEditor, field: 'location', manualLocation: true, error: 'Introduce una latitud entre −90 y 90 y una longitud entre −180 y 180.' });
    } else {
      void submit({ action: 'edit', body: { category: values.category, priority: values.priority, ...point } });
    }
  }

  function openReason(action: ReasonAction) {
    if (locked || fieldEditor) return;
    review.clearFeedback();
    setEditor({ kind: 'reason', action, reason: '' });
  }

  function sendReason() {
    if (!reasonEditor) return;
    const reason = reasonEditor.reason.trim();
    if (!reason) {
      setEditor({ ...reasonEditor, error: 'Escribe un motivo.' });
      return;
    }
    void submit({ action: reasonEditor.action, body: { reason } });
  }

  const editActions = fieldEditor && (
    <>
      <InlineError message={fieldEditor.error || actionError} />
      <View style={styles.buttonRow}>
        <ActionButton id="admin-review-edit" label="Guardar cambios" tone="primary" busy={busy === 'edit'} disabled={locked} onPress={saveFields} />
        <ActionButton label="Cancelar" disabled={locked} onPress={cancelEditor} />
      </View>
    </>
  );

  if (!incident) {
    return (
      <DetailScroll padding={padding}>
        <DetailHeading title="Incidencia" backLabel={fromMap ? 'Volver al mapa' : 'Volver a Incidencias'} onBack={back} />
        {loading && (
          <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencia" style={styles.moduleGroup}>
            <Skeleton style={styles.shortSkeleton} />
            <Skeleton style={styles.detailSkeleton} />
          </View>
        )}
        {readError && <ReadFailure message={readError.message} retryable={readError.retryable} retry={review.refresh} />}
      </DetailScroll>
    );
  }

  const category = fieldEditor?.values.category ?? incident.category;
  const priority = fieldEditor?.values.priority ?? incident.priority ?? '';
  const priorityLabel = priority || 'Sin definir';
  const categoryLabel = categories.find((item) => item.value === category)?.label ?? (category || 'Sin categoría');
  const priorityOptions = priorities.map(({ tone, ...option }) => ({ ...option, color: theme[tone] }));
  const selectedPriority = priorityOptions.find((item) => item.value === priority);
  const hasLocationEditor = fieldEditor?.field === 'location';

  const assignment = incident.history.findLast((entry) => entry.assignment)?.assignment;
  const ticketAndAssignments = (
    <View style={[styles.moduleGroup, ticketAside && styles.across]}>
      <View style={[styles.ticketColumn, ticketAside && styles.ticketColumnAside]}>
        <PinnedTicket incident={incident} retry={review.refresh} />
      </View>
      <Reveal from="bottom" index={3} distance={66} duration={MODULE_ENTER_DURATION} style={ticketAside && styles.grow}>
        <DetailCard id="admin-card-assignments" title="Asignaciones" icon={<UserRound size={17} color={theme.muted} aria-hidden />}>
          {review.assignable ? (
            <AssignmentForm
              locked={locked}
              busy={busy === 'assign'}
              error={actionError}
              clearFeedback={review.clearFeedback}
              onAssign={(body) => void submit({ action: 'assign', body })}
            />
          ) : assignment ? (
            <>
              {assignment.department && <ValueField label="Departamento" value={assignment.department} />}
              {assignment.team && <ValueField label="Equipo" value={assignment.team} />}
              {assignment.technicianId && (
                <ValueField label="Técnico" value={assignment.technicianName || assignment.technicianId} />
              )}
            </>
          ) : (
            <Text style={[styles.secondary, { color: theme.muted }]}>Sin asignaciones registradas.</Text>
          )}
        </DetailCard>
      </Reveal>
    </View>
  );

  return (
    <DetailScroll padding={padding}>
      <DetailHeading
        title={incident.title?.trim() || 'Incidencia sin título'}
        status={incident.status}
        backLabel={fromMap ? 'Volver al mapa' : 'Volver a Incidencias'}
        onBack={back}
      />
      {readError && <ReadFailure message={readError.message} retryable={readError.retryable} retry={review.refresh} />}

      <View style={[styles.moduleGroup, historyAside && styles.across]}>
        <View style={[styles.moduleGroup, historyAside && styles.grow]}>
          <View style={[styles.moduleGroup, styles.overviewLayer, locationAside && styles.alignedColumns]}>
            <View style={[styles.moduleGroup, locationAside && styles.grow, openMenu === 'category' && styles.menuLayer]}>
              <View style={[styles.moduleGroup, styles.fieldLayer, photoAside && styles.across]}>
                <Reveal from="left" distance={88} duration={MODULE_ENTER_DURATION} style={photoAside && styles.imageAside}>
                  <GlassSurface nativeID="admin-card-evidence" style={[styles.imageFrame, { backgroundColor: theme.detailGlass, borderColor: theme.detailGlassBorder }]}>
                    <TicketPhoto style={styles.imageContent} />
                  </GlassSurface>
                </Reveal>

                <Reveal from="top" index={1} distance={62} duration={MODULE_ENTER_DURATION} style={[styles.fieldLayer, photoAside && styles.grow]}>
                  <DetailCard id="admin-card-information" title="Detalles">
                    {showFields ? (
                      <View style={[styles.editorLabel, openMenu === 'category' && styles.menuLayer]}>
                        <Text style={[styles.secondary, { color: theme.muted }]}>Categoría</Text>
                        <GlassFilterMenu
                          id="review-category"
                          label="Categoría"
                          value={category ?? ''}
                          options={categoryOptions}
                          emptyLabel="Sin categoría"
                          field={{ open: openMenu === 'category', onOpenChange: (open) => setOpenMenu(open ? 'category' : null) }}
                          disabled={!canEdit}
                          onChange={(value) => openField('category', { category: value })}
                        />
                      </View>
                    ) : <ValueField label="Categoría" value={categoryLabel} />}
                    {fieldEditor?.field === 'category' && editActions}
                    <ValueField label="Registrada" value={formatDate(incident.registeredAt)} />
                    <ValueField label="Actualizada" value={formatDate(incident.updatedAt)} />
                  </DetailCard>
                </Reveal>
              </View>

              <Reveal from="left" index={2} distance={78} duration={MODULE_ENTER_DURATION} style={locationAside && styles.expand}>
                <DetailCard id="admin-card-description" title="Descripción" style={locationAside ? styles.expand : undefined}>
                  <Text selectable style={[styles.description, { color: theme.text }]}>{incident.description?.trim() || 'Sin descripción.'}</Text>
                </DetailCard>
              </Reveal>
            </View>

            <View style={[styles.moduleGroup, locationAside && styles.locationAside, openMenu === 'priority' && styles.menuLayer]}>
              <Reveal from="top" index={1} distance={68} duration={MODULE_ENTER_DURATION} style={locationAside && styles.expand}>
                <DetailCard id="admin-card-location" title="Ubicación" icon={<MapPin size={17} color={theme.muted} aria-hidden />} style={locationAside ? styles.expand : undefined}>
                  <View nativeID="admin-detail-location-map" style={[styles.mapFrame, { backgroundColor: theme.track }, locationAside && styles.expand]}>
                    <View style={StyleSheet.absoluteFill}>
                      <LocationMap
                        coordinate={point}
                        height="100%"
                        showAttribution={false}
                        onSelect={canEdit ? (coordinate) => openField('location', {
                          latitude: String(coordinate.latitude),
                          longitude: String(coordinate.longitude),
                        }) : undefined}
                      />
                    </View>
                  </View>
                  {showFields && !(hasLocationEditor && fieldEditor.manualLocation) && (
                    <ActionButton id="admin-edit-location" label="Editar coordenadas" disabled={locked} onPress={() => openField('location')} />
                  )}
                  {hasLocationEditor && (
                    <>
                      {fieldEditor.manualLocation && <CoordinateEditor values={fieldEditor.values} disabled={locked} onChange={patchDraft} />}
                      {editActions}
                    </>
                  )}
                </DetailCard>
              </Reveal>

              <Reveal from="bottom" index={2} distance={64} duration={MODULE_ENTER_DURATION} style={styles.fieldLayer}>
                <DetailCard id="admin-card-priority" title="Prioridad" icon={<Flag size={17} color={theme.muted} aria-hidden />}>
                  {showFields ? (
                    <GlassFilterMenu
                      id="review-priority"
                      label="Prioridad"
                      value={priority}
                      options={priorityOptions}
                      emptyLabel={priorityLabel}
                      field={{ open: openMenu === 'priority', onOpenChange: (open) => setOpenMenu(open ? 'priority' : null) }}
                      disabled={!canEdit}
                      onChange={(value) => openField('priority', { priority: value })}
                    />
                  ) : (
                    <View style={styles.cardHeading}>
                      {selectedPriority && <selectedPriority.icon size={17} color={selectedPriority.color} aria-hidden />}
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>{selectedPriority?.label ?? priorityLabel}</Text>
                    </View>
                  )}
                  {fieldEditor?.field === 'priority' && editActions}
                </DetailCard>
              </Reveal>
            </View>
          </View>

          {historyAside && ticketAndAssignments}
        </View>

        <Reveal from="right" index={1} distance={102} duration={MODULE_ENTER_DURATION} style={historyAside && styles.historyAside}>
          <DetailCard id="admin-card-history" title="Historial">
            <Timeline incident={incident} />
            {(review.reviewable || notice) && (
              <View style={[styles.reviewSection, { borderTopColor: theme.border }]}>
                {review.reviewable && !reasonEditor && (
                  <>
                    <View style={styles.buttonRow}>
                      <ActionButton id="admin-review-validate" label="Validar" tone="primary" disabled={locked || !!fieldEditor} busy={busy === 'validate'} onPress={() => void submit({ action: 'validate' })} />
                      <ActionButton id="admin-review-reject" label="Descartar" tone="danger" disabled={locked || !!fieldEditor} onPress={() => openReason('reject')} />
                    </View>
                    <ActionButton id="admin-review-request-information" label="Solicitar información" disabled={locked || !!fieldEditor} onPress={() => openReason('request-information')} />
                    {fieldEditor && <Text style={[styles.secondary, { color: theme.muted }]}>Guarda o cancela los cambios para continuar la revisión.</Text>}
                  </>
                )}
                {review.reviewable && reasonEditor && (
                  <View style={styles.editor}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>{reasonEditor.action === 'reject' ? 'Motivo del descarte' : 'Información que necesitas'}</Text>
                    <TextInput
                      accessibilityLabel={reasonEditor.action === 'reject' ? 'Motivo del descarte' : 'Información que necesitas'}
                      editable={!locked}
                      maxLength={2000}
                      multiline
                      value={reasonEditor.reason}
                      onChangeText={(reason) => setEditor({ ...reasonEditor, reason, error: undefined })}
                      style={[styles.input, styles.reasonInput, { color: theme.text, backgroundColor: theme.track, borderColor: theme.border }]}
                    />
                    <InlineError message={reasonEditor.error || actionError} />
                    <View style={styles.buttonRow}>
                      <ActionButton id={`admin-review-confirm-${reasonEditor.action}`} label={reasonEditor.action === 'reject' ? 'Descartar incidencia' : 'Registrar solicitud'} tone={reasonEditor.action === 'reject' ? 'danger' : 'primary'} disabled={locked} busy={busy === reasonEditor.action} onPress={sendReason} />
                      <ActionButton label="Cancelar" disabled={locked} onPress={cancelEditor} />
                    </View>
                  </View>
                )}
                {!editor && !review.assignable && <InlineError message={actionError} />}
                {notice && <Text accessibilityLiveRegion="polite" style={[styles.secondary, { color: notice.conflict ? theme.warning : theme.success }]}>{notice.text}</Text>}
                {loading && <ActivityIndicator accessibilityLabel="Actualizando incidencia" color={theme.accent} />}
              </View>
            )}
            <View style={[styles.reviewSection, { borderTopColor: theme.border }]}>
              <Text accessibilityRole="header" style={[styles.fieldLabel, { color: theme.text }]}>Comentarios</Text>
              <Text style={[styles.secondary, { color: theme.muted }]}>Los comentarios aún no están disponibles.</Text>
            </View>
          </DetailCard>
        </Reveal>
      </View>

      {!historyAside && ticketAndAssignments}
    </DetailScroll>
  );
}

function AssignmentForm({ locked, busy, error, clearFeedback, onAssign }: {
  locked: boolean;
  busy: boolean;
  error: string;
  clearFeedback: () => void;
  onAssign: (destination: AssignmentDestination) => void;
}) {
  const theme = useAdminTheme();
  const [departmentId, setDepartmentId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [menu, setMenu] = useState<'department' | 'recipient' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; options: AssignmentCatalogOption[]; error?: string }>();

  useEffect(() => {
    const controller = new AbortController();
    getAssignmentCatalog(controller.signal).then((options) => {
      if (!controller.signal.aborted) setResult({ attempt, options });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        const error = cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo de asignaciones.';
        setResult({ attempt, options: [], error });
      }
    });
    return () => controller.abort();
  }, [attempt]);

  if (result?.attempt !== attempt) {
    return <ActivityIndicator accessibilityLabel="Cargando destinos de asignación" color={theme.accent} />;
  }
  if (result.error) {
    return (
      <View style={styles.editor}>
        <InlineError message={result.error} />
        <ActionButton label="Reintentar" onPress={() => setAttempt((current) => current + 1)} />
      </View>
    );
  }

  const departments = result.options
    .filter((option) => option.kind === 'DEPARTMENT')
    .map(({ id, name }) => ({ value: id, label: name ?? id }));
  const recipients = result.options.filter((option) => option.departmentId === departmentId);
  const recipientOptions: GlassFilterOption[] = recipients.map(({ id, name, kind, assignedCount }) => ({
    value: id,
    label: (kind === 'TEAM' ? 'Equipo · ' : 'Técnico · ') + (name?.trim() || id),
    badge: {
      text: String(assignedCount),
      accessibilityLabel: assignedCount === 1 ? '1 incidencia activa' : assignedCount + ' incidencias activas',
    },
  }));
  const recipient = recipients.find(({ id }) => id === recipientId);

  function assign() {
    if (recipient?.kind === 'TEAM') onAssign({ departmentId, teamId: recipient.id });
    if (recipient?.kind === 'TECHNICIAN') onAssign({ departmentId, technicianId: recipient.id });
  }

  if (!departments.length) {
    return <Text style={[styles.secondary, { color: theme.muted }]}>No hay departamentos disponibles.</Text>;
  }

  return (
    <View style={styles.editor}>
      <GlassFilterMenu
        id="assignment-department"
        label="Departamento"
        value={departmentId}
        options={departments}
        emptyLabel="Selecciona un departamento"
        field={{ open: menu === 'department', onOpenChange: (open) => setMenu(open ? 'department' : null), inline: true }}
        disabled={locked}
        onChange={(value) => {
          if (value === departmentId) return;
          clearFeedback();
          setDepartmentId(value);
          setRecipientId('');
        }}
      />
      {!!departmentId && (recipientOptions.length ? (
        <GlassFilterMenu
          id="assignment-recipient"
          label="Equipo o técnico"
          value={recipientId}
          options={recipientOptions}
          emptyLabel="Selecciona un equipo o técnico"
          field={{ open: menu === 'recipient', onOpenChange: (open) => setMenu(open ? 'recipient' : null), inline: true }}
          disabled={locked}
          onChange={(value) => { clearFeedback(); setRecipientId(value); }}
        />
      ) : (
        <Text style={[styles.secondary, { color: theme.muted }]}>Este departamento no tiene equipos ni técnicos disponibles.</Text>
      ))}
      <InlineError message={error} />
      <ActionButton
        id="admin-assign-incident"
        label="Asignar incidencia"
        tone="primary"
        disabled={locked || !recipient}
        busy={busy}
        onPress={assign}
      />
    </View>
  );
}

function DetailScroll({ padding, children }: { padding: number; children: ReactNode }) {
  return (
    <ScrollView
      nativeID="admin-detail-canvas"
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: padding, paddingTop: padding }]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

function DetailHeading({ title, status, backLabel, onBack }: { title: string; status?: string | null; backLabel: string; onBack: () => void }) {
  const theme = useAdminTheme();
  return (
    <View style={styles.heading}>
      <Pressable
        nativeID="admin-detail-back"
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [styles.back, { borderColor: theme.border, backgroundColor: theme.glass, opacity: pressed ? 0.7 : 1 }]}>
        <ArrowLeft size={21} color={theme.text} aria-hidden />
      </Pressable>
      <View style={styles.headingTitle}>
        <Text accessibilityRole="header" selectable style={[styles.title, { color: theme.text }]}>{title}</Text>
        {status && <View style={styles.badge}><StatusPill status={status} /></View>}
      </View>
    </View>
  );
}

function DetailCard({ id, title, icon, children, style }: { id: string; title: string; icon?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  const theme = useAdminTheme();
  return (
    <GlassSurface nativeID={id} style={[styles.card, { backgroundColor: theme.detailGlass, borderColor: theme.detailGlassBorder }, style]}>
      <View style={styles.cardHeading}>
        {icon}
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </GlassSurface>
  );
}

function ValueField({ label, value }: { label: string; value: string }) {
  const theme = useAdminTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.secondary, { color: theme.muted }]}>{label}</Text>
      <Text selectable style={[styles.fieldLabel, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function CoordinateEditor({ values, disabled, onChange }: { values: Draft; disabled: boolean; onChange: (patch: Partial<Draft>) => void }) {
  const theme = useAdminTheme();
  return (
    <View style={styles.editor}>
      {([['latitude', 'Latitud'], ['longitude', 'Longitud']] as const).map(([key, label]) => (
        <View key={key} style={styles.editorLabel}>
          <Text style={[styles.secondary, { color: theme.muted }]}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            editable={!disabled}
            value={values[key]}
            inputMode="decimal"
            onChangeText={(value) => onChange({ [key]: value })}
            style={[styles.input, { color: theme.text, backgroundColor: theme.track, borderColor: theme.border }]}
          />
        </View>
      ))}
    </View>
  );
}

function Timeline({ incident }: { incident: IncidentDetail }) {
  const theme = useAdminTheme();
  const recorded = incident.history.some((entry) => entry.previousStatus == null && entry.status === 'REPORTED' && !reviewHistoryLabel(entry.action));
  const events = [
    ...(recorded ? [] : [{ key: 'reported', title: 'Reportada', status: 'REPORTED', date: incident.registeredAt, reason: null, actor: null }]),
    ...incident.history.map((entry, index) => ({
      key: `${entry.changedAt}-${index}`,
      title: reviewHistoryLabel(entry.action) ?? (entry.status === 'REPORTED' ? 'Reportada' : incidentStatus(entry.status)),
      status: entry.status,
      date: entry.changedAt,
      reason: entry.action === 'INCIDENT_EDITED' && entry.reason ? `Campos modificados · ${entry.reason}` : entry.reason,
      actor: entry.actorName || entry.actorId,
    })),
  ];

  return (
    <View>
      {events.map(({ key, title, status, date, reason, actor }, index) => (
        <View key={key} style={styles.event}>
          <View aria-hidden style={styles.eventTrack}>
            <View style={[styles.eventDot, { backgroundColor: theme[incidentStatusTone(status)] }]} />
            {index !== events.length - 1 && <View style={[styles.eventLine, { backgroundColor: theme.border }]} />}
          </View>
          <View style={[styles.eventCopy, index === events.length - 1 && styles.lastEvent]}>
            <Text style={[styles.eventTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.secondary, { color: theme.muted }]}>{formatDate(date)}</Text>
            {reason && <Text selectable style={[styles.description, { color: theme.text }]}>{reason}</Text>}
            {actor && <Text style={[styles.secondary, { color: theme.muted }]}>{actor}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const PinnedTicket = memo(function PinnedTicket({ incident, retry }: { incident: IncidentDetail; retry: () => void }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 3 : 0);

  useFocusEffect(useCallback(() => {
    if (reduceMotion) {
      progress.set(3);
      return;
    }

    // La subida, el golpe de la chincheta y su asentamiento comparten la misma secuencia.
    progress.set(0);
    progress.set(withSequence(
      withTiming(1, { duration: MODULE_ENTER_DURATION, easing: Easing.out(Easing.cubic) }),
      withTiming(2, { duration: 210, easing: Easing.in(Easing.quad) }),
      withTiming(3, { duration: 140, easing: Easing.out(Easing.cubic) }),
    ));
    return () => progress.set(0);
  }, [progress, reduceMotion]));

  const ticketEntrance = useAnimatedStyle(() => {
    const rise = Math.min(progress.get(), 1);
    return { opacity: rise, transform: [{ translateY: (1 - rise) * 132 }] };
  });
  const pinEntrance = useAnimatedStyle(() => {
    const drop = Math.max(0, progress.get() - 1);
    return {
      opacity: Math.min(drop * 3, 1),
      transform: [
        { translateX: interpolate(drop, [0, 1, 2], [10, -1, 0]) },
        { translateY: interpolate(drop, [0, 1, 2], [-27, 2, 0]) },
      ],
    };
  });
  const shadowEntrance = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(0, (progress.get() - 1.6) / 0.4), 1) }));

  return (
    <View style={styles.pinnedTicket}>
      <Animated.View style={ticketEntrance}>
        <TicketDetail incident={incident} detail={{ state: { status: 'success', data: incident }, retry }} />
      </Animated.View>
      <View pointerEvents="none" aria-hidden style={styles.pin}>
        <Animated.View style={[styles.pinShadow, shadowEntrance]} />
        <Animated.View style={[StyleSheet.absoluteFill, pinEntrance]}>
          <View style={styles.pinBody}>
            <View style={styles.pinNeedle} />
            <View style={styles.pinFoot} />
            <View style={styles.pinStem} />
            <View style={styles.pinCap}><View style={styles.pinGloss} /></View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

function ReadFailure({ message, retryable, retry }: { message: string; retryable: boolean; retry: () => void }) {
  return (
    <DetailCard id="admin-card-detail-error" title="Detalle de incidencia">
      <InlineError message={message} />
      {retryable && <ActionButton label="Reintentar" onPress={retry} />}
    </DetailCard>
  );
}

function InlineError({ message }: { message?: string }) {
  const theme = useAdminTheme();
  return message ? <Text accessibilityRole="alert" style={[styles.secondary, { color: theme.danger, fontWeight: '700' }]}>{message}</Text> : null;
}

function ActionButton({ id, label, tone, busy, disabled, onPress }: { id?: string; label: string; tone?: 'primary' | 'danger'; busy?: boolean; disabled?: boolean; onPress: () => void }) {
  const theme = useAdminTheme();
  const foreground = tone === 'primary' ? theme.background : tone === 'danger' ? theme.danger : theme.accent;
  const background = tone === 'primary' ? theme.accent : theme.surface;
  return (
    <Pressable
      nativeID={id}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: tone === 'primary' ? theme.accent : theme.border, opacity: pressed || (disabled && !busy) ? 0.55 : 1 }]}>
      {busy && <ActivityIndicator size="small" color={foreground} />}
      <Text style={[styles.fieldLabel, { color: foreground, textAlign: 'center' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, marginLeft: ADMIN_COMPACT_SIDEBAR_INSET },
  content: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingBottom: 70, gap: 24 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22 },
  headingTitle: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  title: { flexShrink: 1, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  badge: { alignSelf: 'center' },
  shortSkeleton: { width: '62%', height: 44, borderRadius: 12 },
  detailSkeleton: { height: 270, borderRadius: 16 },
  moduleGroup: { gap: MODULE_GAP },
  across: { flexDirection: 'row', alignItems: 'flex-start' },
  alignedColumns: { flexDirection: 'row', alignItems: 'stretch' },
  grow: { flex: 1, minWidth: 0 },
  expand: { flexGrow: 1 },
  overviewLayer: { zIndex: 2 },
  fieldLayer: { zIndex: 3 },
  menuLayer: { zIndex: 1 },
  historyAside: { width: HISTORY_WIDTH },
  locationAside: { width: LOCATION_WIDTH },
  imageAside: { width: 176 },
  imageFrame: { height: 166, overflow: 'hidden', borderRadius: 16, borderCurve: 'continuous', borderWidth: 1 },
  imageContent: { backgroundColor: 'transparent', borderRadius: 0 },
  mapFrame: { minHeight: 156, position: 'relative', overflow: 'hidden', borderRadius: 12, borderCurve: 'continuous' },
  card: { padding: 16, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.25 },
  description: { fontSize: 14, lineHeight: 21 },
  secondary: { fontSize: 12, lineHeight: 17 },
  field: { minHeight: 42, gap: 2 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  editor: { gap: 10 },
  editorLabel: { gap: 4 },
  input: { minHeight: 42, paddingHorizontal: 10, borderRadius: 10, borderCurve: 'continuous', borderWidth: 1, fontSize: 13 },
  reasonInput: { minHeight: 86, paddingVertical: 8, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, flexGrow: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous' },
  reviewSection: { borderTopWidth: 1, paddingTop: 12, gap: 9 },
  event: { flexDirection: 'row', gap: 10 },
  eventTrack: { width: 12, alignItems: 'center', paddingTop: 4, gap: 3 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventLine: { width: 1, flex: 1 },
  eventCopy: { flex: 1, minWidth: 0, gap: 3, paddingBottom: 17 },
  lastEvent: { paddingBottom: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  ticketColumn: { width: '100%', maxWidth: 350 },
  ticketColumnAside: { flexBasis: 350, flexShrink: 1 },
  pinnedTicket: { marginTop: 17, position: 'relative' },
  pin: { position: 'absolute', top: -24, left: '54%', width: 42, height: 46, zIndex: 2 },
  pinShadow: { position: 'absolute', bottom: 7, left: 11, width: 19, height: 3, borderRadius: 5, backgroundColor: 'rgba(58, 26, 25, 0.17)', boxShadow: '0 2px 5px rgba(45, 19, 18, 0.28)' },
  pinBody: { position: 'absolute', left: 6, top: 1, width: 29, height: 39, transform: [{ rotate: '26deg' }] },
  pinNeedle: { position: 'absolute', top: 23, left: 13, width: 3, height: 15, borderRadius: 2, backgroundColor: '#7D7371' },
  pinFoot: { position: 'absolute', top: 18, left: 2, width: 24, height: 10, borderRadius: 8, backgroundColor: '#A52334', borderTopWidth: 2, borderTopColor: '#F37472' },
  pinStem: { position: 'absolute', top: 8, left: 9, width: 11, height: 14, borderRadius: 4, backgroundColor: '#CE3C46', borderLeftWidth: 2, borderLeftColor: '#F47774' },
  pinCap: { position: 'absolute', top: 0, left: 4, width: 21, height: 13, borderRadius: 9, backgroundColor: '#DD4851', borderTopColor: '#FF9690', borderTopWidth: 2, borderBottomWidth: 2, borderBottomColor: '#912536', boxShadow: '0 2px 3px rgba(91, 19, 28, 0.26)' },
  pinGloss: { position: 'absolute', top: 1, left: 4, width: 9, height: 4, borderRadius: 4, backgroundColor: '#F9857E', opacity: 0.75 },
});

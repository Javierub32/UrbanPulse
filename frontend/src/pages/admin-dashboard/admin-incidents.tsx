import { Link } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { GlassChip } from '@/components/glass-chip';
import { GlassSurface } from '@/components/glass-surface';
import { TicketPhoto } from '@/components/incident-ticket';
import { DateField } from '@/pages/incidents/components/date-field';
import { useIncidents, useIncidentSummary } from '@/pages/incidents/hooks/use-incidents';
import { parseDate, parseLocalDay } from '@/pages/incidents/incident-filters';
import { categories } from '@/pages/report/services/report-service';
import type { IncidentListItem } from '@/types/incidents';

import { useAdminIncidents } from './admin-incidents-context';
import { ADMIN_SIDEBAR_INSET } from './admin-shell';
import { groupCount, groupStatuses, inGroup, type StatusGroup } from './analytics';
import { GlassFilterMenu } from './glass-filter-menu';
import { incidentStatusOptions } from './incident-status';
import { Reveal, Skeleton } from './motion';
import { PendingReviewStack, STACK_SIZE } from './pending-review-stack';
import { StatusPill } from './status-pill';
import { useAdminTheme } from './theme';

const groups: { value: StatusGroup; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'inProgress', label: 'En gestión' },
  { value: 'finished', label: 'Finalizadas' },
];

const initialFilters = { group: 'all' as StatusGroup, query: '', category: '', status: '', from: '', to: '' };
const GRID_BATCH = 12;
const REVIEW_WIDTH = 320;
const COLUMN_GAP = 24;
const PANEL_PADDING = 14;
const GRID_GAP = 12;

function IncidentCard({ incident }: { incident: IncidentListItem }) {
  const theme = useAdminTheme();
  const title = incident.title?.trim() || 'Incidencia sin título';
  const category = categories.find((item) => item.value === incident.category)?.label;
  const date = parseDate(incident.registeredAt);
  const metadata = [category, date?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ');

  return (
    <Link href={`/operator/incident/${incident.id}`} asChild>
      <Pressable
        nativeID={`admin-list-incident-${incident.id}`}
        accessibilityRole="link"
        style={({ pressed, hovered }) => [styles.cardLink, pressed && styles.pressed, hovered && { backgroundColor: theme.track }]}>
        <GlassSurface style={[styles.card, { backgroundColor: theme.cardGlass, borderColor: theme.cardEdge }]}>
          <TicketPhoto compact />
          <View style={styles.cardBody}>
            <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
            {!!metadata && <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>{metadata}</Text>}
            {!!incident.normalizedAddress && (
              <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>{incident.normalizedAddress}</Text>
            )}
            <View style={styles.cardStatus}><StatusPill status={incident.status} /></View>
          </View>
        </GlassSurface>
      </Pressable>
    </Link>
  );
}

export default function AdminIncidentsScreen() {
  const theme = useAdminTheme();
  const { width } = useWindowDimensions();
  const { revision } = useAdminIncidents();
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(filters.query), 220);
    return () => clearTimeout(timeout);
  }, [filters.query]);

  const since = parseLocalDay(filters.from);
  const lastDay = parseLocalDay(filters.to);
  const invalidDates = Boolean(since && lastDay && since > lastDay);
  if (lastDay) lastDay.setDate(lastDay.getDate() + 1);

  const searchPending = query !== filters.query;
  const { state, retry, loadMore } = useIncidents({
    size: GRID_BATCH,
    statuses: filters.status ? [filters.status] : groupStatuses[filters.group],
    category: filters.category,
    query,
    since: since?.toISOString(),
    until: lastDay?.toISOString(),
    includeTotal: true,
  }, !invalidDates && !searchPending, revision);

  const { state: pending } = useIncidents({ size: STACK_SIZE, statuses: ['REPORTED'] }, true, revision);
  const { state: summary } = useIncidentSummary(undefined, revision);
  const page = state.status === 'success' ? state.data : null;
  const visible = page?.items ?? [];
  const total = page?.totalElements ?? 0;
  const advancedCount = Number(Boolean(filters.category)) + Number(Boolean(filters.status)) + Number(Boolean(filters.from || filters.to));
  const filtering = advancedCount > 0 || !!filters.query.trim() || filters.group !== 'all';
  const compact = width < 1100;
  const horizontalPadding = compact ? 20 : 42;
  const contentWidth = width - ADMIN_SIDEBAR_INSET - horizontalPadding * 2;
  const sideBySide = contentWidth >= 810;
  const resultsWidth = sideBySide ? contentWidth - REVIEW_WIDTH - COLUMN_GAP : contentWidth;
  const gridWidth = resultsWidth - PANEL_PADDING * 2;
  const cardWidth = gridWidth >= 502 ? '49%' : '100%';

  function updateFilters(changes: Partial<typeof initialFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, compact && styles.compactContent, { paddingHorizontal: horizontalPadding }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Incidencias</Text>
      <View style={[styles.layout, sideBySide && styles.twoSections]}>
        <View style={styles.reviewColumn}>
          <PendingReviewStack incidents={pending.status === 'success' ? pending.data.items : []}
            loading={pending.status === 'loading'} error={pending.status === 'error'} />
        </View>

        <View style={[styles.results, sideBySide && styles.rightColumn]}>
          <View style={styles.filters}>
            <View accessibilityRole="radiogroup" accessibilityLabel="Grupo de estado" style={styles.chips}>
              {groups.map((option) => (
                <GlassChip
                  key={option.value}
                  nativeID={`admin-filter-${option.value}`}
                  refractive
                  clear
                  label={summary.status === 'success' ? option.label + ' ' + groupCount(summary.data, option.value) : option.label}
                  selected={filters.group === option.value}
                  onPress={() => updateFilters({
                    group: option.value,
                    status: inGroup(filters.status, option.value) ? filters.status : '',
                  })}
                />
              ))}
            </View>
            <View style={styles.searchRow}>
              <GlassSurface style={[styles.search, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
                <View aria-hidden><Search size={16} color={theme.muted} strokeWidth={1.8} /></View>
                <TextInput
                  nativeID="admin-incident-search"
                  accessibilityLabel="Buscar incidencias por título o dirección"
                  value={filters.query}
                  maxLength={200}
                  onChangeText={(query) => updateFilters({ query })}
                  placeholder="Buscar por título o dirección"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text }]}
                />
              </GlassSurface>
              <GlassChip
                nativeID="admin-advanced-filters"
                refractive
                clear
                label={advancedCount ? `Filtros (${advancedCount})` : 'Filtros'}
                selected={advancedOpen}
                accessibilityRole="button"
                accessibilityLabel={advancedOpen ? 'Ocultar filtros avanzados' : 'Mostrar filtros avanzados'}
                onPress={() => setAdvancedOpen((open) => !open)}>
                <SlidersHorizontal size={15} color={advancedOpen ? theme.surface : theme.text} strokeWidth={1.8} />
              </GlassChip>
            </View>
            {advancedOpen && (
              <GlassSurface style={[styles.advanced, { borderColor: theme.glassBorder }]}>
                <View style={[styles.chips, styles.selectors]}>
                  <GlassFilterMenu id="category" label="Categoría" value={filters.category} options={categories} align="left" onChange={(category) => updateFilters({ category })} />
                  <GlassFilterMenu
                    id="status"
                    label="Estado"
                    value={filters.status}
                    options={incidentStatusOptions}
                    emptyLabel="Todos"
                    align={resultsWidth >= 400 ? 'left' : 'right'}
                    onChange={(status) => updateFilters({ status, group: !status || inGroup(status, filters.group) ? filters.group : 'all' })}
                  />
                </View>
                <View style={styles.dates}>
                  <DateField label="Desde" value={filters.from} onChange={(from) => updateFilters({ from })} />
                  <DateField label="Hasta" value={filters.to} onChange={(to) => updateFilters({ to })} />
                </View>
                {invalidDates && (
                  <Text accessibilityRole="alert" style={[styles.meta, { color: theme.danger }]}>La fecha final debe ser igual o posterior a la inicial.</Text>
                )}
              </GlassSurface>
            )}
          </View>

          <View nativeID="admin-incidents-card" style={[styles.panel, { backgroundColor: theme.surface }]}>
            {state.status === 'success' && (
              <View style={styles.panelHeader}>
                <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontVariant: ['tabular-nums'] }}>
                  {total === 1 ? '1 incidencia' : total + ' incidencias'}
                </Text>
                {filtering && (
                  <Pressable nativeID="admin-clear-filters" accessibilityRole="button" onPress={() => updateFilters(initialFilters)} style={styles.action}>
                    <Text style={[styles.actionText, { color: theme.accent }]}>Limpiar filtros</Text>
                  </Pressable>
                )}
              </View>
            )}
            {state.status === 'loading' && !invalidDates && (
              <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencias" style={styles.loading}>
                <Skeleton style={styles.skeleton} />
                <Skeleton style={styles.skeleton} />
              </View>
            )}
            {state.status === 'error' && (
              <View style={styles.empty}>
                <Text accessibilityRole="alert" style={[styles.cardTitle, { color: theme.text }]}>{state.message}</Text>
                <Pressable accessibilityRole="button" onPress={retry} style={styles.action}>
                  <Text style={[styles.actionText, { color: theme.accent }]}>Reintentar</Text>
                </Pressable>
              </View>
            )}
            {(invalidDates || (state.status === 'success' && visible.length === 0)) && (
              <View style={styles.empty}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {invalidDates ? 'Revisa el intervalo de fechas' : filtering ? 'Ninguna incidencia coincide' : 'Todavía no hay incidencias'}
                </Text>
              </View>
            )}
            <View style={styles.grid}>
              {visible.map((incident, index) => (
                <Reveal key={incident.id} index={index % GRID_BATCH} distance={14} style={{ width: cardWidth }}>
                  <IncidentCard incident={incident} />
                </Reveal>
              ))}
            </View>
            {page?.moreError && <Text accessibilityRole="alert" style={[styles.meta, { color: theme.danger }]}>{page.moreError}</Text>}
            {page?.nextPageToken && (
              <Pressable accessibilityRole="button" accessibilityState={{ busy: page.loadingMore }} disabled={page.loadingMore}
                onPress={loadMore} style={[styles.action, styles.more]}>
                <Text style={[styles.actionText, { color: theme.accent }]}>
                  {page.loadingMore ? 'Cargando incidencias…' : page.moreError ? 'Reintentar' : 'Mostrar más incidencias'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingTop: 38, paddingBottom: 64, gap: 24 },
  compactContent: { paddingTop: 24 },
  title: { fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 },
  layout: { gap: COLUMN_GAP },
  twoSections: { flexDirection: 'row', alignItems: 'flex-start' },
  reviewColumn: { zIndex: 1, width: '100%', maxWidth: REVIEW_WIDTH },
  results: { minWidth: 0, gap: 14 },
  rightColumn: { flex: 1 },
  filters: { gap: 10, zIndex: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  search: { flex: 1, minWidth: 172, minHeight: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, borderWidth: 1, borderRadius: 22 },
  input: { flex: 1, minWidth: 0, minHeight: 40, fontSize: 14 },
  advanced: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 14, gap: 12 },
  selectors: { zIndex: 2 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  panel: { borderRadius: 20, borderCurve: 'continuous', padding: PANEL_PADDING },
  panelHeader: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: GRID_GAP, columnGap: '2%' },
  cardLink: { flexGrow: 1, borderRadius: 14, borderCurve: 'continuous' },
  pressed: { opacity: 0.76 },
  card: { flexGrow: 1, minHeight: 116, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, padding: 11, gap: 10, flexDirection: 'row', alignItems: 'center' },
  cardBody: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 16 },
  cardStatus: { alignSelf: 'flex-start', maxWidth: '100%', paddingTop: 3 },
  loading: { gap: 12 },
  skeleton: { height: 116, borderRadius: 14 },
  empty: { paddingHorizontal: 8, paddingVertical: 22, gap: 6 },
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  actionText: { fontSize: 13, fontWeight: '700' },
  more: { alignSelf: 'center', marginTop: 8 },
});

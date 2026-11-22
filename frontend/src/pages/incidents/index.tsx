import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExploreMap } from '@/pages/explore';
import { MAP_EDGE_TRANSITION_HEIGHT } from '@/pages/explore/map-types';
import { GlassChip } from '@/components/glass-chip';
import { GlassSurface } from '@/components/glass-surface';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { categories } from '@/pages/report/services/report-service';
import { ReportSheet } from '@/pages/report/report-sheet';
import { useIncidents, useIncidentSummary } from './hooks/use-incidents';
import { IncidentCard } from './components/incident-card';
import { DateField } from './components/date-field';
import { TICKET_STACK_STEP, TicketOverlay, TicketStackItem, useTicketDetail, type SelectedTicket, type TicketArrival } from './components/ticket-stack';
import { ScreenBehindTicket } from './components/screen-behind-ticket';
import { TicketGrid } from './components/ticket-grid';
import { activeStatuses, dateBounds, initialFilters, matchesFilters, parseDate, resolvedStatuses, type Filters, type StatusGroup } from './incident-filters';
import type { IncidentListItem } from '@/types/incidents';

const LIST_TOP_PADDING = 14;
const statusesByGroup = { all: [], active: activeStatuses, resolved: resolvedStatuses, rejected: ['REJECTED'] };

const quickFilters: { value: StatusGroup; label: string }[] = [{ value: 'all', label: 'Todos' }, { value: 'active', label: 'En proceso' }, { value: 'resolved', label: 'Resueltos' }, { value: 'rejected', label: 'Rechazados' }];
export default function CitizenIncidents() {
  const t = useTheme();
  const { user } = useAuth();
  const citizen = user?.role === 'CITIZEN';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [advanced, setAdvanced] = useState(false);
  const [map, setMap] = useState(false);
  const [filterHeight, setFilterHeight] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [created, setCreated] = useState<IncidentListItem>();
  useFocusEffect(useCallback(() => () => setCreated(undefined), []));
  const [arrival, setArrival] = useState<TicketArrival | null>(null);
  const listRef = useRef<FlatList<IncidentListItem>>(null);
  const listMetrics = useRef({ viewport: 0, offset: 0 });
  const [sheetProgress] = useState(() => new Animated.Value(0));
  const [ticketProgress] = useState(() => new Animated.Value(0));
  const [selectedTicket, setSelectedTicket] = useState<SelectedTicket | null>(null);
  const [screenHeight, setScreenHeight] = useState(0);
  const screenRef = useRef<View>(null);
  const restoreTicketFocus = useRef<(() => void) | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  const bounds = useMemo(() => dateBounds(filters), [filters]);
  const { since, until } = bounds;
  const { state, retry, loadMore } = useIncidents({
    statuses: statusesByGroup[filters.group],
    category: filters.category,
    since,
    until,
  }, bounds.valid);
  const { state: totals, retry: refreshTotals } = useIncidentSummary();
  const page = state.status === 'success' ? state.data : null;
  const showAdvanced = () => {
    setAdvanced(true);
    Animated.timing(sheetProgress, { toValue: 1, duration: reduceMotion ? 0 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeAdvanced = () => {
    if (filters.period === 'custom' && !bounds.valid) return;
    Animated.timing(sheetProgress, { toValue: 0, duration: reduceMotion ? 0 : 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) setAdvanced(false); });
  };
  const visible = useMemo(() => {
    const items = page?.items ?? [];
    if (!created || state.status === 'error' || items.some(({ id }) => id === created.id)
      || !matchesFilters(created, filters, since, until)) {
      return items;
    }
    // El POST permite mostrar de inmediato el aviso creado, aunque su fecha lo sitúe más adelante.
    const time = parseDate(created.registeredAt)?.getTime() ?? -Infinity;
    const index = items.findIndex((item) => {
      const itemTime = parseDate(item.registeredAt)?.getTime() ?? -Infinity;
      return itemTime < time || (itemTime === time && item.id < created.id);
    });
    if (index === -1) return [...items, created];
    return [...items.slice(0, index), created, ...items.slice(index)];
  }, [created, filters, page?.items, since, state.status, until]);
  const frontTicketId = citizen && !map ? visible.at(-1)?.id : undefined;
  const frontTicketDetail = useTicketDetail(frontTicketId);
  const selectedDetail = useTicketDetail(selectedTicket?.last ? undefined : selectedTicket?.incident.id);
  const arrivalIndex = arrival ? visible.findIndex(item => item.id === arrival.id) : -1;
  const finishArrival = useCallback((id: string) => {
    setArrival(current => current?.id === id ? null : current);
  }, []);

  function showCreatedIncident(incident: IncidentListItem) {
    setReportOpen(false);
    setMap(false);
    if (!matchesFilters(incident, filters, since, until)) setFilters(initialFilters);
    setArrival({ id: incident.id, progress: new Animated.Value(0) });
    setCreated(incident);
    retry();
    refreshTotals();
  }

  useLayoutEffect(() => {
    if (!arrival || arrivalIndex < 0 || map) return;
    const { viewport, offset } = listMetrics.current;
    const ticketTop = LIST_TOP_PADDING + arrivalIndex * TICKET_STACK_STEP;
    if (ticketTop < offset || ticketTop + TICKET_STACK_STEP > offset + viewport) {
      listRef.current?.scrollToOffset({ offset: arrivalIndex === 0 ? 0 : Math.max(0, ticketTop - TICKET_STACK_STEP), animated: false });
    }
  }, [arrival, arrivalIndex, map]);
  const filtered = filters.group !== 'all' || !!filters.category || filters.period !== 'all';
  const profileInitials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() ?? '';
  const selectTicket = useCallback((selection: SelectedTicket, restoreFocus: () => void) => {
    const { frame } = selection;
    screenRef.current?.measureInWindow((x, y) => {
      ticketProgress.setValue(0);
      restoreTicketFocus.current = restoreFocus;
      setSelectedTicket({ ...selection, frame: { ...frame, x: frame.x - x, y: frame.y - y } });
    });
  }, [ticketProgress]);
  const closeTicket = useCallback(() => {
    setSelectedTicket(null);
    requestAnimationFrame(() => restoreTicketFocus.current?.());
  }, []);
  const chromeOpacity = ticketProgress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] });
  const mapFilters = { category: filters.category, status: filters.group === 'rejected' ? 'REJECTED' : '', since, until, statusGroup: filters.group === 'active' || filters.group === 'resolved' ? filters.group.toUpperCase() : '' };
  const summary = <View style={styles.summaryRow}>{[{ label: 'En proceso', group: 'active', color: t.warning, bg: t.glassWarm }, { label: 'Resueltos', group: 'resolved', color: t.success, bg: t.glassSuccess }].map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: filters.group === item.group }} onPress={() => setFilters(f => ({ ...f, group: f.group === item.group ? 'all' : item.group as StatusGroup }))} style={{ flex: 1 }}><GlassSurface style={[styles.summary, { backgroundColor: item.bg, borderColor: item.color, borderWidth: filters.group === item.group ? 2.5 : 1.5 }]}>
      <Text style={[styles.count, { color: item.color }]}>{totals.status === 'success' ? statusesByGroup[item.group as 'active' | 'resolved'].reduce((sum, status) => sum + (totals.data.byStatus[status] ?? 0), 0) : '–'}</Text><Text numberOfLines={1} style={[styles.summaryLabel, { color: item.color }]}>{item.label}</Text><View style={[styles.summaryDot, { backgroundColor: item.color }]} />
    </GlassSurface></Pressable>)}</View>;
  const quickControls = <View onLayout={event => setFilterHeight(event.nativeEvent.layout.height)} style={styles.quickControls}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickRow} accessibilityLabel="Filtrar avisos por estado">
        {quickFilters.map(item => <GlassChip key={item.value} label={item.label} refractive selected={filters.group === item.value} onPress={() => setFilters(current => ({ ...current, group: item.value }))} />)}
        <GlassChip label="Más filtros" refractive accessibilityHint="Abre opciones adicionales de filtrado" onPress={showAdvanced} />
      </ScrollView>
    </View>;
  const mapTopInset = filterHeight + MAP_EDGE_TRANSITION_HEIGHT;
  return <View ref={screenRef} collapsable={false} onLayout={event => setScreenHeight(event.nativeEvent.layout.height)} style={[styles.screen, { backgroundColor: t.canvas }]}>
    <TicketGrid />
    <ScreenBehindTicket hidden={!!selectedTicket}>
    <Animated.View aria-hidden={!!selectedTicket} accessibilityElementsHidden={!!selectedTicket} importantForAccessibility={selectedTicket ? 'no-hide-descendants' : 'auto'} style={[styles.topBar, { paddingTop: insets.top + 12, opacity: chromeOpacity }]}>
      <View style={styles.topBarInner}>
        <View style={styles.topBarCopy}>
          <Text accessibilityRole="header" style={[styles.heading, { color: t.ink }]}>{citizen ? 'Mis avisos' : 'Avisos'}</Text>
          <Text style={[styles.subheading, { color: t.muted }]}>{citizen ? 'Sigue el estado de tus avisos' : 'Consulta las incidencias disponibles para tu cuenta'}</Text>
        </View>
        {citizen && <Pressable accessibilityRole="button" accessibilityLabel={user?.name ? `Abrir perfil de ${user.name}` : 'Abrir perfil'} onPress={() => router.push('/profile')} style={({ pressed }) => [styles.avatarPressable, { opacity: pressed ? 0.72 : 1 }]}>
          <GlassSurface refractive style={[styles.profileAvatar, { backgroundColor: t.softAccent, borderColor: t.glassEdge }]}>
            {profileInitials ? <Text style={[styles.profileInitials, { color: t.accent }]}>{profileInitials}</Text> : <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={20} tintColor={t.accent} />}
          </GlassSurface>
        </Pressable>}
      </View>
    </Animated.View>
    <Animated.View style={[styles.dashboard, { opacity: chromeOpacity, zIndex: map ? 1 : undefined }]}>
      {summary}
      {quickControls}
    </Animated.View>
    <View aria-hidden={!!selectedTicket} accessibilityElementsHidden={!!selectedTicket} importantForAccessibility={selectedTicket ? 'no-hide-descendants' : 'auto'} style={map ? styles.mapContent : styles.content}>
      {map ? <View style={[StyleSheet.absoluteFill, { top: -mapTopInset }]}>
        <ExploreMap key={JSON.stringify(mapFilters)} filters={mapFilters} controlsInset={mapTopInset} />
      </View> : <FlatList ref={listRef} data={visible} keyExtractor={item => item.id} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: LIST_TOP_PADDING, paddingBottom: 170 + insets.bottom, gap: citizen ? 0 : 12 }} showsVerticalScrollIndicator={false}
        onLayout={event => { listMetrics.current.viewport = event.nativeEvent.layout.height; }}
        onScroll={event => { listMetrics.current.offset = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        removeClippedSubviews={arrival || selectedTicket ? false : undefined}
        scrollEnabled={!selectedTicket}
        ListFooterComponent={page?.nextPageToken ? <View style={styles.empty}>
          {page.moreError && <Text accessibilityRole="alert" style={[styles.emptyText, { color: t.ink }]}>{page.moreError}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ busy: page.loadingMore }} disabled={page.loadingMore} onPress={loadMore}>
            <Text style={[styles.action, { color: t.accent }]}>{page.loadingMore ? 'Cargando avisos…' : page.moreError ? 'Reintentar' : 'Mostrar más avisos'}</Text>
          </Pressable>
        </View> : null}
        renderItem={({ item, index }) => citizen ? <TicketStackItem
          incident={item}
          detail={item.id === frontTicketId ? frontTicketDetail : undefined}
          selected={selectedTicket?.incident.id === item.id}
          progress={ticketProgress}
          travel={screenHeight}
          arrival={arrivalIndex >= 0 && index >= arrivalIndex ? arrival ?? undefined : undefined}
          reduceMotion={reduceMotion}
          onArrivalFinished={finishArrival}
          onSelect={selectTicket}
        /> : <IncidentCard incident={item} onPress={() => router.push({ pathname: '/incident/[id]', params: { id: item.id } })} />}
        ListEmptyComponent={state.status === 'loading' ? <View style={styles.empty}><ActivityIndicator color={t.accent} /><Text style={{ color: t.muted }}>{citizen ? 'Cargando tus avisos…' : 'Cargando avisos…'}</Text></View> : state.status === 'error' ? <View style={styles.empty}><Text accessibilityRole="alert" style={[styles.emptyText, { color: t.ink }]}>{state.message}</Text><Pressable accessibilityRole="button" onPress={retry}><Text style={[styles.action, { color: t.accent }]}>Reintentar</Text></Pressable></View> : <View style={styles.empty}><SymbolView name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={28} tintColor={t.muted} /><Text style={[styles.emptyTitle, { color: t.ink }]}>{filtered ? 'No hay avisos con estos filtros' : citizen ? 'Todavía no tienes avisos' : 'No hay avisos disponibles'}</Text><Text style={[styles.emptyText, { color: t.muted }]}>{filtered ? 'Prueba a cambiar o limpiar los filtros.' : citizen ? 'Cuando comuniques una incidencia, podrás seguirla aquí.' : 'Los avisos disponibles para tu cuenta aparecerán aquí.'}</Text>{filtered && <Pressable accessibilityRole="button" onPress={() => setFilters(initialFilters)}><Text style={[styles.action, { color: t.accent }]}>Limpiar filtros</Text></Pressable>}</View>} />}
    </View>
    <Animated.View aria-hidden={!!selectedTicket} pointerEvents={selectedTicket ? 'none' : 'box-none'} accessibilityElementsHidden={!!selectedTicket} importantForAccessibility={selectedTicket ? 'no-hide-descendants' : 'auto'} style={[styles.floatingActions, { bottom: Math.max(insets.bottom, 12) + (citizen ? 12 : 96), opacity: chromeOpacity, zIndex: map ? 2 : undefined }]}>
      <View pointerEvents="box-none" style={styles.floatingAlignment}>
        <View pointerEvents="box-none" style={citizen ? styles.floatingColumn : undefined}>
        <GlassSurface refractive style={[styles.mapButton, citizen && styles.roundMapButton, { backgroundColor: citizen ? t.softAccent : undefined, borderColor: t.glassEdge }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={map ? 'Ver lista de avisos' : 'Ver mapa de avisos'} onPress={() => setMap(!map)} style={({ pressed }) => [styles.mapButtonInner, citizen && styles.roundMapButtonInner, pressed && { opacity: 0.7 }]}><SymbolView name={map ? { ios: 'list.bullet', android: 'list', web: 'list' } : { ios: 'map', android: 'map', web: 'map' }} size={citizen ? 19 : 18} tintColor={t.accent} />{!citizen && <Text style={[styles.mapButtonText, { color: t.ink }]}>{map ? 'Ver lista' : 'Ver mapa'}</Text>}</Pressable>
        </GlassSurface>
        {citizen && <GlassSurface refractive style={[styles.reportButton, { backgroundColor: t.accentSurface, borderColor: t.glassEdge }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reportar una incidencia" accessibilityHint="Abre el formulario para comunicar una incidencia" onPress={() => setReportOpen(true)} style={({ pressed }) => [styles.circleButtonInner, pressed && { opacity: 0.75 }]}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={28} tintColor={t.accentContrast} />
          </Pressable>
        </GlassSurface>}
        </View>
      </View>
    </Animated.View>
    </ScreenBehindTicket>
    <Modal visible={advanced} transparent animationType="none" onRequestClose={closeAdvanced}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7, 24, 26, 0.34)', opacity: sheetProgress }]}><Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={StyleSheet.absoluteFill} onPress={closeAdvanced} /></Animated.View>
        <Animated.View accessibilityViewIsModal style={[styles.sheetContainer, { marginBottom: Math.max(insets.bottom, 16), transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }]}>
          <GlassSurface refractive style={[styles.sheet, { borderColor: t.glassEdge }]}>
            <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: t.ink }]}>Filtros</Text><Pressable accessibilityRole="button" onPress={closeAdvanced}><Text style={[styles.action, { color: t.accent }]}>Listo</Text></Pressable></View>
            <ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionTitle, { color: t.ink }]}>Estado</Text><View style={styles.options}>{quickFilters.map(item => <GlassChip key={item.value} label={item.label} selected={filters.group === item.value} onPress={() => setFilters(f => ({ ...f, group: item.value }))} />)}</View>
              <Text style={[styles.sectionTitle, { color: t.ink }]}>Categoría</Text><View style={styles.options}><GlassChip label="Todas" selected={!filters.category} onPress={() => setFilters(f => ({ ...f, category: '' }))} />{categories.map(item => <GlassChip key={item.value} label={item.label} selected={filters.category === item.value} onPress={() => setFilters(f => ({ ...f, category: item.value }))} />)}</View>
              <Text style={[styles.sectionTitle, { color: t.ink }]}>Periodo</Text><View style={styles.options}>{([{ value: 'all', label: 'Todos' }, { value: 'week', label: 'Últimos 7 días' }, { value: 'month', label: 'Últimos 30 días' }, { value: 'custom', label: 'Personalizado' }] as const).map(item => <GlassChip key={item.value} label={item.label} selected={filters.period === item.value} onPress={() => setFilters(f => ({ ...f, period: item.value }))} />)}</View>
              {filters.period === 'custom' && <><Text style={[styles.emptyText, { color: t.muted, textAlign: 'left' }]}>Elige un día o añade una fecha final para buscar un intervalo.</Text><View style={styles.options}><DateField label="Desde" value={filters.from} onChange={value => setFilters(f => ({ ...f, from: value }))} /><DateField label="Hasta (opcional)" value={filters.to} onChange={value => setFilters(f => ({ ...f, to: value }))} /></View>{!bounds.valid && <Text accessibilityRole="alert" style={{ color: t.error }}>Elige una fecha inicial y comprueba que la fecha final no sea anterior.</Text>}</>}
              <Pressable accessibilityRole="button" onPress={() => setFilters(initialFilters)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[styles.action, { color: t.accent }]}>Restablecer filtros</Text></Pressable>
            </ScrollView>
          </GlassSurface>
        </Animated.View>
      </View>
    </Modal>
    <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} onSubmitted={showCreatedIncident} />
    {selectedTicket && <TicketOverlay selection={selectedTicket} detail={selectedTicket.last ? frontTicketDetail : selectedDetail} progress={ticketProgress} rootHeight={screenHeight} top={insets.top + 64} reduceMotion={reduceMotion} onClosed={closeTicket} />}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, topBar: { paddingHorizontal: 20, paddingBottom: 16 }, topBarInner: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 }, topBarCopy: { flex: 1, gap: 2 }, content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }, mapContent: { flex: 1 }, dashboard: { width: '100%', maxWidth: 560, paddingHorizontal: 20, alignSelf: 'center', gap: 10 },
  heading: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.6 }, subheading: { fontSize: 14, lineHeight: 20, marginBottom: 2 }, profileAvatar: { width: 48, height: 48, borderRadius: 24, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 14px rgba(15, 56, 58, 0.12)' }, profileInitials: { fontSize: 16, fontWeight: '700' }, avatarPressable: { borderRadius: 24 }, summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 6 }, summary: { flex: 1, minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderStyle: 'dashed', boxShadow: '0 5px 14px rgba(32, 71, 61, 0.09), inset 0 1px 1px rgba(255, 255, 255, 0.5)' }, count: { fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] }, summaryDot: { height: 7, width: 7, borderRadius: 4, opacity: 0.8, marginLeft: 'auto' }, summaryLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  quickControls: { gap: 4 }, quickScroll: { marginRight: -20 }, quickRow: { gap: 8, paddingVertical: 4, paddingRight: 20 }, floatingActions: { position: 'absolute', left: 0, right: 0, alignItems: 'center' }, floatingAlignment: { width: '100%', paddingHorizontal: 20, alignItems: 'flex-end' }, floatingColumn: { width: 62, alignItems: 'center', gap: 12 }, mapButton: { borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, boxShadow: '0 8px 24px rgba(15, 56, 58, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.6)' }, mapButtonInner: { paddingHorizontal: 18, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }, roundMapButton: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' }, roundMapButtonInner: { width: '100%', height: '100%', minHeight: 46, paddingHorizontal: 0, justifyContent: 'center' }, mapButtonText: { fontSize: 14, fontWeight: '700' }, reportButton: { width: 62, height: 62, borderRadius: 31, borderCurve: 'continuous', borderWidth: 1, overflow: 'hidden', boxShadow: '0 9px 24px rgba(15, 80, 70, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)' }, circleButtonInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 42 }, emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' }, emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' }, action: { fontWeight: '700', fontSize: 14, paddingVertical: 8 }, overlay: { flex: 1, justifyContent: 'flex-end' }, sheetContainer: { width: '92%', maxWidth: 560, maxHeight: '85%', alignSelf: 'center' }, sheet: { borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, padding: 20, boxShadow: '0 -8px 32px rgba(15, 56, 58, 0.18)' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, sheetTitle: { fontSize: 22, fontWeight: '700' }, sectionTitle: { fontSize: 15, fontWeight: '700' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

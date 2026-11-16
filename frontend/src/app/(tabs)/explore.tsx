import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IncidentMap from '@/pages/explore/components/incident-map';
import { FilterSelect } from '@/pages/explore/components/filter-select';
import { startOfPeriod, timeFilters, type TimeFilter } from '@/pages/explore/time-filters';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '@/services/api-client';
import type { MapItem, MapViewport } from '@/pages/explore/map-types';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';

const statuses: Record<string, string> = { REPORTED: 'Comunicada', VALIDATED: 'Validada', REJECTED: 'Rechazada', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta', REOPENED: 'Reabierta', CLOSED: 'Cerrada' };

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<TimeFilter>('all');
  const [since, setSince] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [cluster, setCluster] = useState<MapItem | null>(null);
  const [page, setPage] = useState(0);
  const [members, setMembers] = useState<{ status: 'loading' | 'success' | 'error'; data: MapItem[] }>({ status: 'loading', data: [] });
  useEffect(() => {
    if (!cluster) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setMembers({ status: 'loading', data: [] });
      const params = new URLSearchParams({ west: String(cluster.west), south: String(cluster.south), east: String(cluster.east), north: String(cluster.north), page: String(page) });
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (since) params.set('since', since);
      apiRequest<MapItem[]>(`/api/incidents/map-members?${params}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setMembers({ status: 'success', data }); })
        .catch(() => { if (!controller.signal.aborted) setMembers({ status: 'error', data: [] }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cluster, page, category, status, since, refresh]);
  const [incidents, setIncidents] = useState<{ status: 'loading' | 'success' | 'error'; data: MapItem[]; message?: string }>({ status: 'loading', data: [] });
  const retry = () => setRefresh(value => value + 1);
  useEffect(() => {
    if (!viewport) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIncidents(previous => ({ ...previous, status: 'loading' }));
      const params = new URLSearchParams(Object.entries(viewport).map(([key, value]) => [key, String(value)]));
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (since) params.set('since', since);
      apiRequest<MapItem[]>(`/api/incidents/map?${params}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setIncidents({ status: 'success', data }); })
        .catch(error => { if (!controller.signal.aborted) setIncidents({ status: 'error', data: [], message: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [viewport, category, status, since, refresh]);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [popupHeight, setPopupHeight] = useState(220);
  const selected = incidents.data.find(incident => incident.id === selection?.id);
  const locations = incidents.data;
  const handleLoaded = useCallback(() => setMapStatus('ready'), []);
  const handleError = useCallback(() => setMapStatus('error'), []);
  const handleSelect = useCallback((id: string, point: { x: number; y: number }) => setSelection({ id, ...point }), []);
  const close = useCallback(() => setSelection(null), []);
  useFocusEffect(useCallback(() => {
    if (process.env.EXPO_OS === 'web') {
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && cluster) setCluster(null);
        else if (event.key === 'Escape' && selection) close();
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cluster) { setCluster(null); return true; }
      if (!selection) return false;
      close();
      return true;
    });
    return () => subscription.remove();
  }, [selection, cluster, close]));

  const popupWidth = Math.max(0, Math.min(320, mapSize.width - 24));
  const left = selection ? Math.max(12, Math.min(selection.x - popupWidth / 2, mapSize.width - popupWidth - 12)) : 12;
  const top = selection ? Math.max(8, Math.min(selection.y >= popupHeight + 18 ? selection.y - popupHeight - 14 : selection.y + 14, mapSize.height - popupHeight - 8)) : 8;

  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + Spacing.three, paddingBottom: 72 + insets.bottom, paddingHorizontal: Spacing.three }}>
    <View style={{ gap: Spacing.one }}>
      <ThemedText type="subtitle">Mapa de incidencias</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Selecciona un punto para ver su información.</ThemedText>
    </View>
    <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><ThemedText type="smallBold">Filtros</ThemedText>{(category || status || period !== 'all') ? <Pressable accessibilityRole="button" onPress={() => { setCategory(''); setStatus(''); setPeriod('all'); setSince(null); setSelection(null); setCluster(null); }}><ThemedText type="linkPrimary">Limpiar</ThemedText></Pressable> : null}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }} accessibilityLabel="Filtrar por fecha">
        {timeFilters.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: period === item.value }} onPress={() => { setPeriod(item.value); setSince(startOfPeriod(item.value)); setSelection(null); setCluster(null); }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: period === item.value ? theme.accentSurface : theme.backgroundElement }}><ThemedText type="smallBold" style={period === item.value ? { color: theme.accentContrast } : undefined}>{item.label}</ThemedText></Pressable>)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <FilterSelect label="Categoría" value={category} options={categories} onChange={value => { setCategory(value); setSelection(null); }} />
        <FilterSelect label="Estado" value={status} options={Object.entries(statuses).map(([value, label]) => ({ value, label }))} onChange={value => { setStatus(value); setSelection(null); }} />
      </View>
    </View>
    <View onLayout={event => setMapSize(event.nativeEvent.layout)} style={{ flex: 1, maxHeight: height * 0.65, marginTop: Spacing.three, marginBottom: Spacing.three, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.backgroundElement }}>
      <IncidentMap key={attempt} items={locations} onSelectCluster={item => { setPage(0); setCluster(item); }} onViewport={setViewport} onLoaded={handleLoaded} onError={handleError} onSelectIncident={handleSelect} />
      {mapStatus === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando mapa" style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ActivityIndicator /><ThemedText>Cargando mapa…</ThemedText></View>}
      {mapStatus === 'error' && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ThemedText selectable>No se ha podido cargar el mapa.</ThemedText><Pressable accessibilityRole="button" onPress={() => { setMapStatus('loading'); setAttempt(value => value + 1); }}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></View>}
      {mapStatus === 'ready' && incidents.status !== 'success' && <View style={{ position: 'absolute', top: 12, left: 12, right: 12, padding: Spacing.two, backgroundColor: theme.background, borderRadius: 12 }}>
        {incidents.status === 'loading' ? <ThemedText>Cargando incidencias…</ThemedText> : <><ThemedText accessibilityRole="alert">{incidents.message}</ThemedText><Pressable accessibilityRole="button" onPress={retry}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></>}
      </View>}
      {mapStatus === 'ready' && incidents.status === 'success' && locations.length === 0 && <View style={{ position: 'absolute', top: 12, left: 12, right: 12, padding: Spacing.two, backgroundColor: theme.background, borderRadius: 12 }}><ThemedText>No hay incidencias en esta zona con los filtros seleccionados.</ThemedText></View>}
      {cluster && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, padding: Spacing.three }]} accessibilityViewIsModal>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}><ThemedText type="smallBold">{cluster.count} incidencias agrupadas</ThemedText><Pressable accessibilityRole="button" onPress={() => setCluster(null)}><ThemedText type="linkPrimary">Cerrar</ThemedText></Pressable></View>
        {members.status === 'loading' && <ActivityIndicator accessibilityLabel="Cargando incidencias" />}
        {members.status === 'error' && <Pressable accessibilityRole="button" onPress={retry}><ThemedText type="linkPrimary">Error al cargar. Reintentar</ThemedText></Pressable>}
        {members.status === 'success' && <><ScrollView>{members.data.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setCluster(null); if (item.id) router.push({ pathname: '/incident/[id]', params: { id: item.id } }); }} style={{ paddingVertical: Spacing.two }}><ThemedText>{item.title || 'Incidencia sin título'} →</ThemedText></Pressable>)}</ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" disabled={page === 0} onPress={() => setPage(page - 1)}><ThemedText type="linkPrimary">{page > 0 ? 'Anterior' : ''}</ThemedText></Pressable><ThemedText>Página {page + 1}</ThemedText><Pressable accessibilityRole="button" disabled={(page + 1) * 50 >= cluster.count} onPress={() => setPage(page + 1)}><ThemedText type="linkPrimary">{(page + 1) * 50 < cluster.count ? 'Siguiente' : ''}</ThemedText></Pressable></View></>}
      </View>}
      {selected && selection && <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar resumen" onPress={close} style={StyleSheet.absoluteFill} />
        <View onLayout={event => setPopupHeight(event.nativeEvent.layout.height)} style={{ position: 'absolute', left, top, width: popupWidth, maxHeight: Math.max(0, mapSize.height - 16), borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.background, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)' }}>
          <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
            <View style={{ flex: 1, gap: Spacing.one }}><ThemedText type="small" style={{ color: theme.accent }}>INCIDENCIA</ThemedText><ThemedText type="smallBold" selectable>{selected.title || 'Incidencia sin título'}</ThemedText></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar resumen" hitSlop={8} onPress={close} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: theme.backgroundElement }}><ThemedText style={{ fontSize: 22 }}>×</ThemedText></Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">{categories.find(category => category.value === selected.category)?.label ?? selected.category ?? 'Categoría no disponible'}</ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>{selected.status ? statuses[selected.status] ?? selected.status : 'Estado no disponible'}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => { close(); router.push({ pathname: '/incident/[id]', params: { id: selection.id } }); }} style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSurface, opacity: pressed ? 0.75 : 1 })}><ThemedText type="smallBold" style={{ color: theme.accentContrast }}>Ver incidencia completa →</ThemedText></Pressable>
          </ScrollView>
        </View>
      </View>}
    </View>
  </View>;
}

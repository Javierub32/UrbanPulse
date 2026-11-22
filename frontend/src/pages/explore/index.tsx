import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, Minus, Plus, X } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import IncidentMap from '@/pages/explore/components/incident-map';
import { FilterSelect } from '@/pages/explore/components/filter-select';
import { MapTopFade } from '@/pages/explore/components/map-top-fade';
import { useIncidentMapStyle } from './map-style';
import { startOfPeriod, timeFilters, type TimeFilter } from '@/pages/explore/time-filters';
import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/glass-surface';
import { TicketGrid } from '@/pages/incidents/components/ticket-grid';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '@/services/api-client';
import { MAP_EDGE_TRANSITION_HEIGHT, type MapItem, type MapViewport } from '@/pages/explore/map-types';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';

const statuses: Record<string, string> = { REPORTED: 'Comunicada', VALIDATED: 'Validada', REJECTED: 'Rechazada', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta', REOPENED: 'Reabierta', CLOSED: 'Cerrada' };

export type EmbeddedMapFilters = { category: string; status: string; since: string | null; until: string | null; statusGroup: string };

type ExploreMapProps = {
  filters?: EmbeddedMapFilters;
  controlsInset?: number;
  /** Alto del difuminado superior cuando los controles flotantes ocupan más que una fila. */
  fadeHeight?: number;
  /** `progressive`: el mapa llega al borde superior y el desenfoque crece hacia arriba. */
  topEdge?: 'transition' | 'progressive';
  /** Margen izquierdo libre, por ejemplo bajo una barra lateral flotante. */
  leftInset?: number;
  /** Margen derecho libre, por ejemplo bajo un panel lateral abierto. */
  rightInset?: number;
  /** Sustituye la apertura del detalle ciudadano desde la vista previa. */
  openLabel?: string;
  onOpenIncident?: (item: MapItem) => void;
  /**
   * Si se indica, pulsar un punto llama a esta función y la vista previa pasa a mostrarse al
   * pasar el puntero por encima (web).
   */
  onPressIncident?: (item: MapItem) => void;
  /** Web: cada valor nuevo reproduce el zoom de entrada del mapa. */
  introKey?: number;
  /** Se llama cuando el mapa termina de cargar o muestra un error. */
  onMapSettled?: () => void;
  /** Web: botones de zoom de cristal en vertical, junto al margen izquierdo (`leftInset`). */
  zoomControls?: boolean;
};

export function ExploreMap({ filters, controlsInset, fadeHeight, topEdge = 'transition', leftInset = 0, rightInset = 0, openLabel = 'Abrir incidencia', onOpenIncident, onPressIncident, introKey, onMapSettled, zoomControls = false }: ExploreMapProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapStyle = useIncidentMapStyle();
  const fadeId = 'map-top-fade-' + useId().replace(/[^\w-]/g, '');
  const [controlsHeight, setControlsHeight] = useState(0);
  const router = useRouter();
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [localCategory, setCategory] = useState('');
  const [localStatus, setStatus] = useState('');
  const [period, setPeriod] = useState<TimeFilter>('all');
  const [localSince, setSince] = useState<string | null>(null);
  const category = filters?.category ?? localCategory;
  const status = filters?.status ?? localStatus;
  const since = filters ? filters.since : localSince;
  const until = filters?.until ?? null;
  const statusGroup = filters?.statusGroup ?? '';
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
      if (until) params.set('until', until);
      if (statusGroup) params.set('statusGroup', statusGroup);
      apiRequest<MapItem[]>(`/api/incidents/map-members?${params}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setMembers({ status: 'success', data }); })
        .catch(() => { if (!controller.signal.aborted) setMembers({ status: 'error', data: [] }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cluster, page, category, status, since, until, statusGroup, refresh]);
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
      if (until) params.set('until', until);
      if (statusGroup) params.set('statusGroup', statusGroup);
      apiRequest<MapItem[]>(`/api/incidents/map?${params}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setIncidents({ status: 'success', data }); })
        .catch(error => { if (!controller.signal.aborted) setIncidents({ status: 'error', data: [], message: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [viewport, category, status, since, until, statusGroup, refresh]);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<{ item: MapItem; x: number; y: number } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [previewHeight, setPreviewHeight] = useState(160);
  const locations = incidents.data;
  const handleLoaded = useCallback(() => { setMapStatus('ready'); onMapSettled?.(); }, [onMapSettled]);
  const handleError = useCallback(() => { setMapStatus('error'); onMapSettled?.(); }, [onMapSettled]);
  const hoverPreview = !!onPressIncident;
  const [zoomRequest, setZoomRequest] = useState<{ key: number; delta: number } | undefined>();
  const zoom = (delta: number) => setZoomRequest(current => ({ key: (current?.key ?? 0) + 1, delta }));
  const hoverClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overPreview = useRef(false);
  const keepPreview = useCallback(() => { if (hoverClose.current) clearTimeout(hoverClose.current); hoverClose.current = null; }, []);
  // Al salir del punto, la vista previa espera un momento para que el puntero pueda llegar a ella.
  // El aviso de salida del mapa llega después de la entrada en la vista previa, así que se ignora si el puntero ya está dentro.
  const releasePreview = useCallback(() => {
    keepPreview();
    if (!overPreview.current) hoverClose.current = setTimeout(() => setPreview(null), 250);
  }, [keepPreview]);
  const enterPreview = useCallback(() => { overPreview.current = true; keepPreview(); }, [keepPreview]);
  const leavePreview = useCallback(() => { overPreview.current = false; releasePreview(); }, [releasePreview]);
  useEffect(() => { if (!preview) overPreview.current = false; }, [preview]);
  useEffect(() => keepPreview, [keepPreview]);
  const selectIncident = useCallback((id: string, point: { x: number; y: number }) => {
    const item = locations.find(incident => incident.id === id);
    if (!item) return;
    if (onPressIncident) onPressIncident(item);
    else setPreview({ item, ...point });
  }, [locations, onPressIncident]);
  const hoverIncident = useCallback((id: string | null, point?: { x: number; y: number }) => {
    if (!id || !point) { releasePreview(); return; }
    const item = locations.find(incident => incident.id === id);
    if (!item) return;
    keepPreview();
    setPreview({ item, ...point });
  }, [locations, keepPreview, releasePreview]);
  const closeSelection = useCallback(() => {
    if (preview) setPreview(null);
    else setCluster(null);
  }, [preview]);

  useFocusEffect(useCallback(() => {
    if (!cluster && !preview) return;
    if (process.env.EXPO_OS === 'web') {
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeSelection();
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSelection();
      return true;
    });
    return () => subscription.remove();
  }, [cluster, preview, closeSelection]));

  const previewWidth = Math.max(0, Math.min(320, mapSize.width - leftInset - rightInset - 24));
  const previewLeft = preview ? Math.max(leftInset + 12, Math.min(preview.x - previewWidth / 2, mapSize.width - rightInset - previewWidth - 12)) : leftInset + 12;
  const lastPreviewTop = Math.max(8, mapSize.height - previewHeight - 8);
  const filterBottom = controlsInset ?? controlsHeight;
  const firstPreviewTop = Math.min(filterBottom + 4, lastPreviewTop);
  const markerPreviewTop = preview && preview.y >= firstPreviewTop + previewHeight + 18
    ? preview.y - previewHeight - 14
    : (preview?.y ?? 0) + 14;
  const previewTop = Math.max(firstPreviewTop, Math.min(markerPreviewTop, lastPreviewTop));

  const filterControls = !filters && <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><ThemedText type="smallBold">Filtros</ThemedText>{(category || status || period !== 'all') ? <Pressable accessibilityRole="button" onPress={() => { setCategory(''); setStatus(''); setPeriod('all'); setSince(null); setCluster(null); setPreview(null); }}><ThemedText type="linkPrimary">Limpiar</ThemedText></Pressable> : null}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }} accessibilityLabel="Filtrar por fecha">
        {timeFilters.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: period === item.value }} onPress={() => { setPeriod(item.value); setSince(startOfPeriod(item.value)); setCluster(null); setPreview(null); }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: period === item.value ? theme.accentSurface : theme.backgroundElement }}><ThemedText type="smallBold" style={period === item.value ? { color: theme.accentContrast } : undefined}>{item.label}</ThemedText></Pressable>)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <FilterSelect label="Categoría" value={category} options={categories} onChange={value => { setCategory(value); setPreview(null); }} />
        <FilterSelect label="Estado" value={status} options={Object.entries(statuses).map(([value, label]) => ({ value, label }))} onChange={value => { setStatus(value); setPreview(null); }} />
      </View>
    </View>;

  return <View style={styles.screen}>
    {!filters && <>
      <TicketGrid />
      <View style={[styles.mapHeading, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText type="subtitle">Mapa de incidencias</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Selecciona un punto para ver su información.</ThemedText>
      </View>
    </>}
    <View onLayout={({ nativeEvent: { layout: { width, height } } }) => setMapSize(current => current.width === width && current.height === height ? current : { width, height })} style={styles.map}>
      {mapStyle && <IncidentMap key={attempt} items={locations} mapStyle={mapStyle} bottomInset={insets.bottom} topEdge={topEdge === 'progressive' ? 'none' : 'fade'} onSelectCluster={item => { setPreview(null); setPage(0); setCluster(item); }} onViewport={setViewport} onLoaded={handleLoaded} onError={handleError} onSelectIncident={selectIncident} onHoverIncident={hoverPreview ? hoverIncident : undefined} introKey={introKey} zoomRequest={zoomRequest} />}
      {mapStatus === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando mapa" style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ActivityIndicator /><ThemedText>Cargando mapa…</ThemedText></View>}
      {mapStatus === 'error' && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ThemedText selectable>No se ha podido cargar el mapa.</ThemedText><Pressable accessibilityRole="button" onPress={() => { setMapStatus('loading'); setAttempt(value => value + 1); }}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></View>}
      <MapTopFade height={fadeHeight ?? (filters ? MAP_EDGE_TRANSITION_HEIGHT + 24 : controlsHeight + 32)} progressive={topEdge === 'progressive'}>
          <Svg width="100%" height="100%" aria-hidden>
            <Defs><LinearGradient id={fadeId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor={theme.canvas} stopOpacity={process.env.EXPO_OS === 'web' ? (topEdge === 'progressive' ? 0.4 : 0.25) : 1} />
              <Stop offset="0.42" stopColor={theme.canvas} stopOpacity={process.env.EXPO_OS === 'web' ? (topEdge === 'progressive' ? 0.1 : 0.12) : 0.5} />
              <Stop offset="1" stopColor={theme.canvas} stopOpacity={0} />
            </LinearGradient></Defs>
            <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
          </Svg>
      </MapTopFade>
      {filterControls &&
        <View pointerEvents="box-none" style={styles.mapTop}>
          <View onLayout={event => setControlsHeight(event.nativeEvent.layout.height)} style={styles.filters}>
            {filterControls}
          </View>
        </View>
      }
      {zoomControls && process.env.EXPO_OS === 'web' && mapStatus === 'ready' && <View pointerEvents="box-none" style={[styles.zoomColumn, { left: leftInset }]}>
        <GlassSurface refractive style={[styles.zoom, { borderColor: theme.glassEdge, backgroundColor: theme.filterGlassClear }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Acercar el mapa" onPress={() => zoom(1)} style={({ pressed }) => [styles.zoomButton, { opacity: pressed ? 0.6 : 1 }]}><Plus size={18} color={theme.ink} /></Pressable>
          <View style={[styles.zoomDivider, { backgroundColor: theme.glassEdge }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Alejar el mapa" onPress={() => zoom(-1)} style={({ pressed }) => [styles.zoomButton, { opacity: pressed ? 0.6 : 1 }]}><Minus size={18} color={theme.ink} /></Pressable>
        </GlassSurface>
      </View>}
      {/* Aviso de estado: píldora de cristal bajo los filtros. La carga solo se anuncia si aún no hay puntos que mostrar. */}
      {mapStatus === 'ready' && (incidents.status === 'error' || (incidents.status === 'loading' && locations.length === 0) || (incidents.status === 'success' && locations.length === 0)) && <View pointerEvents="box-none" style={[styles.noteRow, { top: filterBottom + 8, left: leftInset + 12 }]}>
        <GlassSurface refractive style={[styles.note, { borderColor: theme.glassEdge }]}>
          {incidents.status === 'error'
            ? <><ThemedText type="small" accessibilityRole="alert" style={{ color: theme.ink, flexShrink: 1 }}>{incidents.message}</ThemedText><Pressable accessibilityRole="button" onPress={retry}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></>
            : <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.ink }}>{incidents.status === 'loading' ? 'Cargando incidencias…' : 'No hay incidencias en esta zona con los filtros seleccionados.'}</ThemedText>}
        </GlassSurface>
      </View>}
      {cluster && <View style={[StyleSheet.absoluteFill, { top: controlsInset ?? 0, left: leftInset, backgroundColor: theme.background, padding: Spacing.three }]} accessibilityViewIsModal>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}><ThemedText type="smallBold">{cluster.count} incidencias agrupadas</ThemedText><Pressable accessibilityRole="button" onPress={() => setCluster(null)}><ThemedText type="linkPrimary">Cerrar</ThemedText></Pressable></View>
        {members.status === 'loading' && <ActivityIndicator accessibilityLabel="Cargando incidencias" />}
        {members.status === 'error' && <Pressable accessibilityRole="button" onPress={retry}><ThemedText type="linkPrimary">Error al cargar. Reintentar</ThemedText></Pressable>}
        {members.status === 'success' && <><ScrollView>{members.data.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => setPreview({ item, x: mapSize.width / 2, y: mapSize.height / 2 })} style={{ paddingVertical: Spacing.two }}><ThemedText>{item.title || 'Incidencia sin título'} →</ThemedText></Pressable>)}</ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" disabled={page === 0} onPress={() => setPage(page - 1)}><ThemedText type="linkPrimary">{page > 0 ? 'Anterior' : ''}</ThemedText></Pressable><ThemedText>Página {page + 1}</ThemedText><Pressable accessibilityRole="button" disabled={(page + 1) * 50 >= cluster.count} onPress={() => setPage(page + 1)}><ThemedText type="linkPrimary">{(page + 1) * 50 < cluster.count ? 'Siguiente' : ''}</ThemedText></Pressable></View></>}
      </View>}
      {preview?.item.id && previewWidth > 0 && <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {!hoverPreview && <Pressable accessible={false} importantForAccessibility="no" onPress={closeSelection} style={StyleSheet.absoluteFill} />}
        <GlassSurface refractive accessibilityViewIsModal={!hoverPreview} onPointerEnter={hoverPreview ? enterPreview : undefined} onPointerLeave={hoverPreview ? leavePreview : undefined} onLayout={event => setPreviewHeight(event.nativeEvent.layout.height)} style={[styles.preview, {
          left: previewLeft, top: previewTop, width: previewWidth, maxHeight: Math.max(0, mapSize.height - 16), borderColor: theme.glassEdge,
        }]}>
          <ScrollView contentContainerStyle={styles.previewContent} keyboardShouldPersistTaps="handled">
            <View style={styles.previewHeader}>
              <View style={styles.previewCopy}>
                <ThemedText accessibilityRole="header" type="smallBold" style={{ color: theme.ink }}>{preview.item.title?.trim() || 'Incidencia sin título'}</ThemedText>
                <ThemedText type="small" style={{ color: theme.muted }}>{categories.find(category => category.value === preview.item.category)?.label ?? preview.item.category ?? 'Categoría no disponible'}</ThemedText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={closeSelection} style={styles.closePreview}>
                <X size={20} color={theme.ink} />
              </Pressable>
            </View>
            <GlassSurface refractive style={[styles.openGlass, { borderColor: theme.glassEdge, backgroundColor: theme.glassSelected }]}>
              <Pressable accessibilityRole="button" onPress={() => {
                if (!preview.item.id) return;
                if (onOpenIncident) { onOpenIncident(preview.item); setPreview(null); }
                else router.push({ pathname: '/incident/[id]', params: { id: preview.item.id } });
              }} style={({ pressed }) => [styles.openTicket, { opacity: pressed ? 0.7 : 1 }]}>
                <ThemedText type="smallBold" style={{ color: theme.ink }}>{openLabel}</ThemedText>
                <ArrowUpRight size={16} color={theme.accent} />
              </Pressable>
            </GlassSurface>
          </ScrollView>
        </GlassSurface>
      </View>}
    </View>
  </View>;
}

export default function ExploreScreen() { return <ExploreMap />; }

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapHeading: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.one },
  map: { flex: 1, overflow: 'hidden' },
  noteRow: { position: 'absolute', right: 12, alignItems: 'center' },
  zoomColumn: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  zoom: { width: 44, borderRadius: 22, borderWidth: 1, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 6px 18px rgba(15, 56, 58, 0.14)' },
  zoomButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, marginHorizontal: 10 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%', minHeight: 36, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15, 56, 58, 0.12)' },
  mapTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  filters: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  preview: { position: 'absolute', borderWidth: 1, borderRadius: 22, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 8px 26px rgba(0, 0, 0, 0.2)' },
  previewContent: { padding: 12, gap: 8 },
  previewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  previewCopy: { flex: 1, minWidth: 0, gap: 3, paddingTop: 5 },
  closePreview: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  openGlass: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  openTicket: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 8 },
});

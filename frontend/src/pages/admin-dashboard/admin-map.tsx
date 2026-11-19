import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { GlassChip } from '@/components/glass-chip';
import { GlassSurface } from '@/components/glass-surface';
import { useTheme } from '@/hooks/use-theme';
import { ExploreMap, type EmbeddedMapFilters } from '@/pages/explore';
import type { MapItem } from '@/pages/explore/map-types';
import { startOfPeriod, timeFilters, type TimeFilter } from '@/pages/explore/time-filters';
import { TicketDetail, useTicketDetail } from '@/pages/incidents/components/ticket-stack';
import { categories } from '@/pages/report/services/report-service';
import { ADMIN_SIDEBAR_INSET } from './admin-shell';
import { incidentStatusOptions } from './incident-status';
import { useAdminTheme } from './theme';

type Option = { value: string; label: string };
const TICKET_WIDTH = 500;
// Sombra ambiental que sigue la silueta del papel (incluido el borde rasgado), por encima de la del propio ticket.
const PAPER_LIFT = 'drop-shadow(0 16px 20px rgba(15, 40, 40, 0.14)) drop-shadow(0 2px 4px rgba(15, 40, 40, 0.08))';
const TICKET_RIGHT = 32;
const TICKET_GAP = 14;
// Fila del botón de cerrar sobre el papel, con su separación.
const TICKET_HEAD = 40 + TICKET_GAP;
// Aire de papel entre el último texto y el desgarre.
const PAPER_FOOTER = 32;
// Parte del pie del papel que queda bajo el borde de la pantalla en reposo: el desgarre y un poco de aire.
const TEAR_HIDDEN = 20;
// Margen entre «Más información» y el borde inferior al terminar el desplazamiento.
const BOTTOM_MARGIN = 20;

function Chevron({ open, color }: { open: boolean; color: string }) {
  return <View aria-hidden><Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></Svg></View>;
}

/** Filtro desplegable de cristal: la píldora muestra el valor y abre el menú justo debajo. */
function GlassFilterMenu({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly Option[]; onChange: (value: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={{ position: 'relative', zIndex: open ? 3 : 1 }}>
      <GlassChip nativeID={`admin-select-${id}`} refractive clear label={`${label}: ${selected?.label ?? 'Todas'}`} selected={!!selected} accessibilityRole="button" onPress={() => setOpen((current) => !current)}>
        <Chevron open={open} color={selected ? t.accentContrast : t.muted} />
      </GlassChip>
      {open && (
        <>
          <Pressable accessibilityLabel={`Cerrar ${label}`} onPress={() => setOpen(false)} style={{ position: 'absolute', top: -3000, left: -3000, width: 6000, height: 6000, cursor: 'auto' }} />
          <GlassSurface refractive accessibilityRole="menu" style={[styles.menu, { borderColor: t.glassEdge }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[{ value: '', label: 'Todas' }, ...options].map((option) => {
                const active = option.value === value;
                return (
                  <Pressable key={option.value} nativeID={`admin-option-${id}-${option.value || 'all'}`} accessibilityRole="menuitem" accessibilityState={{ selected: active }} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.menuItem, active && { backgroundColor: t.glassSelected }]}>
                    <Text style={{ color: active ? t.accent : t.ink, fontSize: 13, fontWeight: active ? '700' : '600' }}>{option.label}</Text>
                    {active && <Text aria-hidden style={{ color: t.accent, fontSize: 13, fontWeight: '800' }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassSurface>
        </>
      )}
    </View>
  );
}

/**
 * Ticket que envió el ciudadano, pegado al borde derecho. En reposo asoma desde abajo con el borde
 * rasgado fuera de la pantalla; la rueda lo desplaza hacia arriba por encima de toda la interfaz
 * hasta que «Más información» queda a la vista con un margen sobre el borde inferior.
 */
function TicketPanel({ item, minTop, screenHeight, onClosed, onOpen, onWidth }: { item: MapItem & { id: string }; minTop: number; screenHeight: number; onClosed: () => void; onOpen: (id: string) => void; onWidth: (width: number) => void }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const detail = useTicketDetail(item.id);
  const panelRef = useRef<View>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [offset] = useState(() => new Animated.Value(0));
  const scrolled = useRef(0);
  const [paperHeight, setPaperHeight] = useState(0);
  const [panelHeight, setPanelHeight] = useState(0);

  // Reposo: bajo los filtros, o más abajo si el ticket es corto, para que el desgarre quede fuera.
  const restTop = Math.max(minTop, screenHeight - TICKET_HEAD - paperHeight + TEAR_HIDDEN);
  const maxOffset = Math.max(0, restTop + panelHeight + BOTTOM_MARGIN - screenHeight);

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 380, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  const close = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) onClosed(); });
  }, [onClosed, progress, reduceMotion]);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  // La rueda sobre el ticket lo desplaza; se detiene cuando aparece «Más información».
  useEffect(() => {
    const node = panelRef.current as unknown as HTMLElement | null;
    if (process.env.EXPO_OS !== 'web' || !node?.addEventListener) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scrolled.current = Math.min(maxOffset, Math.max(0, scrolled.current + event.deltaY));
      offset.setValue(scrolled.current);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [maxOffset, offset]);

  useEffect(() => {
    if (scrolled.current > maxOffset) { scrolled.current = maxOffset; offset.setValue(maxOffset); }
  }, [maxOffset, offset]);

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [Math.max(0, screenHeight - restTop) + 40, 0] });
  const translateY = Animated.subtract(slide, offset);
  return (
    <Animated.View
      ref={panelRef}
      nativeID="admin-map-ticket"
      role="dialog"
      aria-label="Ticket de la incidencia"
      onLayout={(event) => { setPanelHeight(event.nativeEvent.layout.height); onWidth(event.nativeEvent.layout.width + TICKET_RIGHT); }}
      style={[styles.ticketPanel, { top: restTop, transform: [{ translateY }] }]}
    >
      <View style={{ height: TICKET_HEAD - TICKET_GAP, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <GlassSurface refractive style={[styles.round, { borderColor: t.glassEdge }]}>
          <Pressable nativeID="admin-map-close" accessibilityRole="button" accessibilityLabel="Cerrar ticket" onPress={close} style={styles.roundInner}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth={2.4} strokeLinecap="round"><Path d="M6 6l12 12M18 6 6 18" /></Svg>
          </Pressable>
        </GlassSurface>
      </View>
      <View onLayout={(event) => setPaperHeight(event.nativeEvent.layout.height)} style={process.env.EXPO_OS === 'web' ? { filter: PAPER_LIFT } : undefined}>
        <TicketDetail incident={{ id: item.id, title: item.title, status: item.status }} detail={detail} footerSpace={PAPER_FOOTER} />
      </View>
      <GlassSurface refractive style={[styles.moreGlass, { borderColor: t.glassEdge, backgroundColor: t.filterGlassClear }]}>
        <Pressable nativeID="admin-map-open" accessibilityRole="link" onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: t.ink, fontSize: 14, fontWeight: '700' }}>Más información</Text>
          <Text aria-hidden style={{ color: t.accent, fontSize: 15, fontWeight: '800' }}>↗</Text>
        </Pressable>
      </GlassSurface>
    </Animated.View>
  );
}

export default function AdminMapScreen() {
  const theme = useAdminTheme();
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<TimeFilter>('all');
  const [since, setSince] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  // El desenfoque empieza (a cero) bajo el subtítulo y crece hasta el borde superior.
  const [blurHeight, setBlurHeight] = useState(0);
  const [ticket, setTicket] = useState<(MapItem & { id: string }) | null>(null);
  const [ticketWidth, setTicketWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  // Al ocultar la pestaña las medidas llegan a cero; se ignoran para conservar el mapa ya cargado.
  const filters = useMemo<EmbeddedMapFilters>(() => ({ category, status, since, until: null, statusGroup: '' }), [category, status, since]);
  const filtered = !!category || !!status || period !== 'all';
  // Al entrar en la pestaña, el mapa aparece con un fundido y un ligero zoom hacia la zona de referencia.
  const reduceMotion = useReducedMotion();
  const [mapOpacity] = useState(() => new Animated.Value(0));
  const [introKey, setIntroKey] = useState(0);
  const mapReady = useRef(false);
  // El fundido espera a que el mapa haya cargado para no mostrar el estado de carga.
  const fadeIn = useCallback(() => {
    Animated.timing(mapOpacity, { toValue: 1, duration: reduceMotion ? 0 : 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [mapOpacity, reduceMotion]);
  const handleMapReady = useCallback(() => { mapReady.current = true; fadeIn(); }, [fadeIn]);
  useFocusEffect(useCallback(() => {
    setIntroKey((value) => value + 1);
    mapOpacity.setValue(0);
    if (mapReady.current) fadeIn();
    return () => mapOpacity.stopAnimation();
  }, [fadeIn, mapOpacity]));

  // Pulsar un punto abre su ticket (pasar por encima muestra el menú); si es el mismo, se conserva sin repetir la animación.
  const openTicket = useCallback((item: MapItem) => { const id = item.id; if (id) setTicket((current) => (current?.id === id ? current : { ...item, id })); }, []);
  const openIncident = useCallback((id: string) => router.push({ pathname: '/operator/incident/[id]', params: { id, from: 'map' } }), [router]);

  return (
    <View nativeID="admin-map" onLayout={(event) => { const { height } = event.nativeEvent.layout; if (height > 0) setScreenHeight(height); }} style={{ flex: 1 }}>
      {headerHeight > 0 && blurHeight > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapOpacity }]}>
          <ExploreMap
            introKey={introKey}
            onMapReady={handleMapReady}
            zoomControls
            filters={filters}
            controlsInset={headerHeight}
            fadeHeight={blurHeight}
            topEdge="progressive"
            leftInset={ADMIN_SIDEBAR_INSET}
            rightInset={ticket ? ticketWidth : 0}
            openLabel="Ver incidencia completa"
            onOpenIncident={(item) => { if (item.id) openIncident(item.id); }}
            onPressIncident={openTicket}
          />
        </Animated.View>
      )}

      <View pointerEvents="box-none" onLayout={(event) => { const { height } = event.nativeEvent.layout; if (height > 0) setHeaderHeight(height); }} style={{ position: 'absolute', top: 0, left: ADMIN_SIDEBAR_INSET, right: 0, paddingHorizontal: 30, paddingTop: 30, paddingBottom: 6, gap: 14, zIndex: 2 }}>
        <View pointerEvents="none" onLayout={(event) => { const { y, height } = event.nativeEvent.layout; if (height > 0) setBlurHeight(y + height); }} style={{ gap: 4 }}>
          <Text style={{ color: theme.text, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 }}>Mapa</Text>
          <Text style={{ color: theme.muted, fontSize: 15 }}>Pasa por encima de un punto para ver su resumen y púlsalo para abrir el ticket.</Text>
        </View>
        <View pointerEvents="box-none" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Filtrar por fecha" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {timeFilters.map((item) => (
              <GlassChip key={item.value} nativeID={`admin-filter-${item.value}`} refractive clear label={item.label} selected={period === item.value} onPress={() => { setPeriod(item.value); setSince(startOfPeriod(item.value)); }} />
            ))}
          </View>
          <View pointerEvents="box-none" style={{ marginLeft: 'auto', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {filtered && <GlassChip nativeID="admin-map-clear" refractive clear label="Limpiar" onPress={() => { setCategory(''); setStatus(''); setPeriod('all'); setSince(null); }} />}
            <GlassFilterMenu id="category" label="Categoría" value={category} options={categories} onChange={setCategory} />
            <GlassFilterMenu id="status" label="Estado" value={status} options={incidentStatusOptions} onChange={setStatus} />
          </View>
        </View>
      </View>

      {ticket && screenHeight > 0 && <TicketPanel key={ticket.id} item={ticket} minTop={headerHeight + 8} screenHeight={screenHeight} onClosed={() => setTicket(null)} onOpen={openIncident} onWidth={setTicketWidth} />}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', top: 46, right: 0, minWidth: 220, maxHeight: 336, padding: 6, borderRadius: 18, borderWidth: 1, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 56, 58, 0.16)' },
  menuItem: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ticketPanel: { position: 'absolute', right: TICKET_RIGHT, width: TICKET_WIDTH, maxWidth: '45%', gap: TICKET_GAP, zIndex: 5 },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, overflow: 'hidden', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' },
  roundInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  moreGlass: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15, 56, 58, 0.14)' },
  more: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
});

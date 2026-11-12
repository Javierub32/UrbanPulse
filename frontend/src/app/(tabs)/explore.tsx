import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IncidentMap from '@/pages/explore/components/incident-map';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIncidents } from '@/pages/incidents/hooks/use-incidents';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';
import type { IncidentLocation } from '@/types/incidents';

const EMPTY_LOCATIONS: IncidentLocation[] = [];
const statuses: Record<string, string> = { REPORTED: 'Comunicada', VALIDATED: 'Validada', REJECTED: 'Rechazada', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta', REOPENED: 'Reabierta', CLOSED: 'Cerrada' };

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { state: incidents, retry } = useIncidents();
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [popupHeight, setPopupHeight] = useState(220);
  const selected = incidents.status === 'success' ? incidents.data.find(incident => incident.id === selection?.id) : undefined;
  const locations = useMemo(() => {
    if (incidents.status !== 'success') return EMPTY_LOCATIONS;
    return incidents.data.flatMap(incident => incident.latitude == null || incident.longitude == null ? [] : [{ id: incident.id, latitude: incident.latitude, longitude: incident.longitude }]);
  }, [incidents]);
  const handleLoaded = useCallback(() => setMapStatus('ready'), []);
  const handleError = useCallback(() => setMapStatus('error'), []);
  const handleSelect = useCallback((id: string, point: { x: number; y: number }) => setSelection({ id, ...point }), []);
  const close = useCallback(() => setSelection(null), []);
  useFocusEffect(useCallback(() => {
    if (process.env.EXPO_OS === 'web') {
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && selection) close();
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selection) return false;
      close();
      return true;
    });
    return () => subscription.remove();
  }, [selection, close]));

  const popupWidth = Math.max(0, Math.min(320, mapSize.width - 24));
  const left = selection ? Math.max(12, Math.min(selection.x - popupWidth / 2, mapSize.width - popupWidth - 12)) : 12;
  const top = selection ? Math.max(8, Math.min(selection.y >= popupHeight + 18 ? selection.y - popupHeight - 14 : selection.y + 14, mapSize.height - popupHeight - 8)) : 8;

  return <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + Spacing.three, paddingBottom: 72 + insets.bottom, paddingHorizontal: Spacing.three }}>
    <View style={{ gap: Spacing.one }}>
      <ThemedText type="subtitle">Mapa de incidencias</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Selecciona un punto para ver su información.</ThemedText>
    </View>
    <View onLayout={event => setMapSize(event.nativeEvent.layout)} style={{ flex: 1, maxHeight: height * 0.65, marginTop: Spacing.five, marginBottom: Spacing.three, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.backgroundElement }}>
      <IncidentMap key={attempt} locations={locations} onLoaded={handleLoaded} onError={handleError} onSelectIncident={handleSelect} />
      {mapStatus === 'loading' && <View accessibilityRole="progressbar" accessibilityLabel="Cargando mapa" style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ActivityIndicator /><ThemedText>Cargando mapa…</ThemedText></View>}
      {mapStatus === 'error' && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}><ThemedText selectable>No se ha podido cargar el mapa.</ThemedText><Pressable accessibilityRole="button" onPress={() => { setMapStatus('loading'); setAttempt(value => value + 1); }}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></View>}
      {mapStatus === 'ready' && incidents.status !== 'success' && <View style={{ position: 'absolute', top: 12, left: 12, right: 12, padding: Spacing.two, backgroundColor: theme.background, borderRadius: 12 }}>
        {incidents.status === 'loading' ? <ThemedText>Cargando incidencias…</ThemedText> : <><ThemedText accessibilityRole="alert">{incidents.message}</ThemedText><Pressable accessibilityRole="button" onPress={retry}><ThemedText type="linkPrimary">Reintentar</ThemedText></Pressable></>}
      </View>}
      {mapStatus === 'ready' && incidents.status === 'success' && locations.length === 0 && <View style={{ position: 'absolute', top: 12, left: 12, right: 12, padding: Spacing.two, backgroundColor: theme.background, borderRadius: 12 }}><ThemedText>No hay incidencias con ubicación disponible.</ThemedText></View>}
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
          <Pressable accessibilityRole="button" onPress={() => { close(); router.push({ pathname: '/incident/[id]', params: { id: selected.id } }); }} style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentSurface, opacity: pressed ? 0.75 : 1 })}><ThemedText type="smallBold" style={{ color: theme.accentContrast }}>Ver incidencia completa →</ThemedText></Pressable>
          </ScrollView>
        </View>
      </View>}
    </View>
  </View>;
}

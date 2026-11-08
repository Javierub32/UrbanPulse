import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import IncidentMap from '@/pages/explore/components/incident-map';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIncidents } from '@/pages/incidents/hooks/use-incidents';
import { useTheme } from '@/hooks/use-theme';
import type { IncidentLocation } from '@/types/incidents';

const EMPTY_LOCATIONS: IncidentLocation[] = [];

export default function ExploreScreen() {
  const theme = useTheme();
  const { state: incidents, retry } = useIncidents();
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const locations = useMemo(() => {
    if (incidents.status !== 'success') return EMPTY_LOCATIONS;
    return incidents.data.flatMap((incident) => incident.latitude == null || incident.longitude == null
      ? []
      : [{ id: incident.id, latitude: incident.latitude, longitude: incident.longitude }]);
  }, [incidents]);
  const handleLoaded = useCallback(() => setMapStatus('ready'), []);
  const handleError = useCallback(() => setMapStatus('error'), []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.four, paddingBottom: 120, gap: Spacing.four }}
    >
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="subtitle">Mapa de incidencias</ThemedText>
        <ThemedText themeColor="textSecondary">Consulta dónde se encuentran las incidencias registradas.</ThemedText>
      </View>

      <View style={{ height: 300, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: theme.backgroundElement }}>
        <IncidentMap key={attempt} locations={locations} onLoaded={handleLoaded} onError={handleError} />
        {mapStatus === 'loading' && (
          <View accessibilityRole="progressbar" accessibilityLabel="Cargando mapa" style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }]}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">Cargando mapa…</ThemedText>
          </View>
        )}
        {mapStatus === 'error' && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center', padding: Spacing.three, gap: Spacing.two }]}>
            <ThemedText selectable>No se ha podido cargar el mapa.</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => { setMapStatus('loading'); setAttempt((value) => value + 1); }}>
              <ThemedText type="linkPrimary">Reintentar</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {incidents.status === 'loading' && <ThemedText themeColor="textSecondary">Cargando incidencias…</ThemedText>}
      {incidents.status === 'error' && (
        <View style={{ gap: Spacing.two }}>
          <ThemedText selectable accessibilityRole="alert">{incidents.message}</ThemedText>
          <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}>
            <ThemedText type="linkPrimary">Reintentar</ThemedText>
          </Pressable>
        </View>
      )}
      {incidents.status === 'success' && locations.length === 0 && (
        <ThemedText themeColor="textSecondary">
          {incidents.data.length === 0 ? 'Todavía no hay incidencias registradas.' : 'No hay ubicaciones disponibles.'}
        </ThemedText>
      )}
    </ScrollView>
  );
}

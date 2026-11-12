import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIncidents } from '@/pages/incidents/hooks/use-incidents';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';

const statusLabels: Record<string, string> = {
  REPORTED: 'Registrada', VALIDATED: 'Validada', REJECTED: 'Rechazada',
  ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta',
  REOPENED: 'Reabierta', CLOSED: 'Cerrada',
};

export default function HomeScreen() {
  const theme = useTheme();
  const { state, retry } = useIncidents();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.four, paddingBottom: 120, gap: Spacing.four }}
      data={state.status === 'success' ? state.data : []}
      keyExtractor={(incident) => incident.id}
      ListHeaderComponent={
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="subtitle">Incidencias de la ciudad</ThemedText>
          <ThemedText themeColor="textSecondary">
            Consulta las incidencias registradas.
          </ThemedText>
        </View>
      }
      ListEmptyComponent={
        state.status === 'loading' ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencias" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">Cargando incidencias…</ThemedText>
          </View>
        ) : state.status === 'error' ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText selectable accessibilityRole="alert">{state.message}</ThemedText>
            <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}>
              <ThemedText type="linkPrimary">Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ThemedText themeColor="textSecondary">Todavía no hay incidencias registradas.</ThemedText>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      renderItem={({ item }) => (
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 12, padding: Spacing.three, gap: Spacing.two }}>
          <ThemedText type="smallBold" selectable>{item.title?.trim() || 'Incidencia sin título'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {categories.find((category) => category.value === item.category)?.label ?? item.category ?? 'Categoría no disponible'}
            {' · '}
            {item.status ? (statusLabels[item.status] ?? item.status) : 'Estado no disponible'}
          </ThemedText>
          {item.registeredAt && (
            <ThemedText type="small" themeColor="textSecondary">
              {new Date(item.registeredAt).toLocaleDateString('es-ES')}
            </ThemedText>
          )}
        </View>
      )}
    />
  );
}

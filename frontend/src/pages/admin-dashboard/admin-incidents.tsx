import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { categories } from '@/pages/report/services/report-service';
import { useAdminIncidents } from './admin-incidents-context';
import { inGroup, relativeTime, type StatusGroup } from './analytics';
import { Reveal, Skeleton } from './motion';
import { StatusPill } from './status-pill';
import { useAdminTheme } from './theme';

const groups: { value: StatusGroup; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'inProgress', label: 'En gestión' },
  { value: 'finished', label: 'Finalizadas' },
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function AdminIncidentsScreen() {
  const theme = useAdminTheme();
  const { state, retry } = useAdminIncidents();
  const [group, setGroup] = useState<StatusGroup>('all');
  const [query, setQuery] = useState('');
  const incidents = useMemo(() => (state.status === 'success' ? state.data : []), [state]);
  const counts = useMemo(() => Object.fromEntries(groups.map(({ value }) => [value, incidents.filter((item) => inGroup(item.status, value)).length])), [incidents]);
  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    return incidents.filter((item) => inGroup(item.status, group) && (!needle || normalize(item.title ?? '').includes(needle)));
  }, [incidents, group, query]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ padding: 42, paddingTop: 38, paddingBottom: 64, gap: 22 }}>
      <Reveal index={0}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 }}>Incidencias</Text>
          <Text style={{ color: theme.muted, fontSize: 15 }}>Consulta las incidencias registradas y abre su historial.</Text>
        </View>
      </Reveal>

      <Reveal index={1}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {groups.map((option) => {
              const selected = option.value === group;
              return (
                <Pressable key={option.value} nativeID={`admin-filter-${option.value}`} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setGroup(option.value)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: selected ? theme.accent : theme.surface, borderWidth: 1, borderColor: selected ? theme.accent : theme.border }}>
                  <Text style={{ color: selected ? theme.background : theme.text, fontSize: 13, fontWeight: '700' }}>{option.label}</Text>
                  <Text style={{ color: selected ? theme.background : theme.muted, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'], opacity: 0.85 }}>{counts[option.value]}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            nativeID="admin-incident-search"
            accessibilityLabel="Buscar incidencias por título"
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por título…"
            placeholderTextColor={theme.muted}
            style={{ marginLeft: 'auto', minWidth: 240, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, color: theme.text, fontSize: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
          />
        </View>
      </Reveal>

      <Reveal index={2}>
        <View nativeID="admin-incidents-card" style={{ backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 24, paddingVertical: 10 }}>
          {state.status === 'loading' && (
            <View accessibilityRole="progressbar" accessibilityLabel="Cargando incidencias" style={{ paddingVertical: 14, gap: 12 }}>
              {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} style={{ height: 54, borderRadius: 12 }} />)}
            </View>
          )}
          {state.status === 'error' && (
            <View style={{ paddingVertical: 30, gap: 8 }}>
              <Text accessibilityRole="alert" style={{ color: theme.text, fontWeight: '700' }}>{state.message}</Text>
              <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.accent, fontWeight: '700' }}>Reintentar</Text></Pressable>
            </View>
          )}
          {state.status === 'success' && visible.length === 0 && (
            <View style={{ paddingVertical: 42, gap: 6 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{incidents.length === 0 ? 'Todavía no hay incidencias' : 'Ninguna incidencia coincide'}</Text>
              <Text style={{ color: theme.muted }}>{incidents.length === 0 ? 'Las incidencias registradas aparecerán aquí.' : 'Prueba con otro estado o con otra búsqueda.'}</Text>
            </View>
          )}
          {visible.map((incident, index) => {
            const category = categories.find((item) => item.value === incident.category)?.label ?? incident.category ?? 'Sin categoría';
            return (
              <Link key={incident.id} href={`/operator/incident/${incident.id}`} asChild>
                <Pressable nativeID={`admin-list-incident-${incident.id}`} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: 12, borderCurve: 'continuous', borderBottomWidth: index === visible.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{incident.title?.trim() || 'Incidencia sin título'}</Text>
                    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{category} · {relativeTime(incident.registeredAt)}</Text>
                  </View>
                  <StatusPill status={incident.status} />
                </Pressable>
              </Link>
            );
          })}
        </View>
      </Reveal>
    </ScrollView>
  );
}

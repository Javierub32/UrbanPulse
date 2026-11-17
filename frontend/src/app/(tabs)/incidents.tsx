import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api-client';
import type { IncidentListItem } from '@/types/incidents';

type Page = { content: IncidentListItem[]; number: number; totalPages: number };
export default function IncidentsScreen() {
  const { session } = useAuth();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Page | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => { setRefresh(x => x + 1); }, []));
  useEffect(() => {
    if (session?.user.role !== 'OPERATOR') return;
    const controller = new AbortController();
    apiRequest<Page>(`/api/operator/reviews?page=${page}`, { signal: controller.signal })
      .then(data => { setItems(data); setError(''); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [session?.user.role, page, refresh]);
  if (session?.user.role !== 'OPERATOR') return <ThemedView style={{ flex: 1, padding: 24 }}><ThemedText type="title">Incidencias</ThemedText><ThemedText>Aquí podrás consultar el estado y el historial de tus avisos.</ThemedText></ThemedView>;
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <ThemedText type="title">Pendientes de revisión</ThemedText>
    {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
    {items && items.content.length === 0 && <ThemedText>No hay incidencias pendientes.</ThemedText>}
    {items?.content.map(item => <Link key={item.id} href={{ pathname: '/incident/[id]', params: { id: item.id } }} asChild><Pressable style={{ paddingVertical: 12 }}><ThemedText type="linkPrimary">{item.title || 'Incidencia sin título'}</ThemedText><ThemedText>{item.category}</ThemedText></Pressable></Link>)}
    <View style={{ flexDirection: 'row', gap: 24 }}>
      {page > 0 && <Pressable onPress={() => setPage(page - 1)}><ThemedText type="linkPrimary">Anterior</ThemedText></Pressable>}
      {items && page + 1 < items.totalPages && <Pressable onPress={() => setPage(page + 1)}><ThemedText type="linkPrimary">Siguiente</ThemedText></Pressable>}
    </View>
  </ScrollView>;
}

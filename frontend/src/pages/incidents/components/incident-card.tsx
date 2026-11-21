import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { IncidentListItem } from '@/types/incidents';
import { parseDate, statusGroup, statusLabel } from '../incident-filters';
import { categories } from '@/pages/report/services/report-service';

const categoryLabel = (category: string | null) => categories.find(item => item.value === category)?.label ?? category ?? 'Sin categoría';

export function IncidentPhoto({ url }: { url?: string | null }) {
  const theme = useTheme();
  return <View style={[styles.photo, { backgroundColor: theme.softAccent }]}>
    {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Fotografía del aviso" /> :
      <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={24} tintColor={theme.muted} />}
  </View>;
}
export function IncidentCard({ incident, onPress }: { incident: IncidentListItem; onPress: () => void }) {
  const theme = useTheme();
  const group = statusGroup(incident.status);
  const tone = incident.status === 'REJECTED' ? theme.danger : group === 'active' ? theme.warning : group === 'resolved' ? theme.success : theme.muted;
  const toneSurface = incident.status === 'REJECTED' ? theme.dangerSurface : group === 'active' ? theme.warningSurface : group === 'resolved' ? theme.successSurface : theme.backgroundElement;
  const date = parseDate(incident.registeredAt);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver aviso: ${incident.title || 'Sin título'}`} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.line, opacity: pressed ? 0.75 : 1 }]}>
    <View style={styles.row}>
      <View style={styles.info}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.ink }]}>{incident.title?.trim() || 'Aviso sin título'}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>{incident.normalizedAddress?.trim() || 'Ubicación no disponible'}</Text>
        <Text style={[styles.meta, { color: theme.muted }]}>{date ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha no disponible'}</Text>
      </View>
      <IncidentPhoto />
    </View>
    <View style={styles.tags}>
      <View style={[styles.tag, { backgroundColor: toneSurface }]}><View style={[styles.dot, { backgroundColor: tone }]} /><Text numberOfLines={1} style={[styles.tagText, { color: tone }]}>{statusLabel(incident.status)}</Text></View>
      <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}><Text numberOfLines={1} style={[styles.tagText, { color: theme.muted }]}>{categoryLabel(incident.category)}</Text></View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 18, borderCurve: 'continuous', padding: 16, borderWidth: 1, gap: 14, boxShadow: '0 7px 20px rgba(18, 62, 56, 0.09)' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, info: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700', marginBottom: 3 }, meta: { fontSize: 13, lineHeight: 18 },
  photo: { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  tagText: { fontSize: 12, lineHeight: 16, fontWeight: '600', flexShrink: 1 }, dot: { height: 6, width: 6, borderRadius: 3 },
});

import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glass-surface';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useIncidentSummary } from '@/pages/incidents/hooks/use-incidents';
import { activeStatuses, resolvedStatuses } from '@/pages/incidents/incident-filters';
import type { UserRole } from '@/types/auth';

const roles: Record<UserRole, string> = { CITIZEN: 'Ciudadano', OPERATOR: 'Operador', TECHNICIAN: 'Técnico', ADMINISTRATOR: 'Administrador', ANALYST: 'Analista' };

function CitizenStats() {
  const t = useTheme();
  const { state, retry } = useIncidentSummary();
  const data = state.status === 'success' ? state.data : null;
  const count = (statuses: string[]) => statuses.reduce((sum, status) => sum + (data?.byStatus[status] ?? 0), 0);
  const stats = [
    { label: 'Publicados', value: data?.total ?? 0, color: t.accent },
    { label: 'En proceso', value: count(activeStatuses), color: t.warning },
    { label: 'Resueltos', value: count(resolvedStatuses), color: t.success },
  ];
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: t.ink }]}>Tu actividad</Text>
    {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="Cargando actividad" color={t.accent} /> : state.status === 'error' ? <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: t.muted }}>{state.message}</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.action}><Text style={{ color: t.accent, fontWeight: '700' }}>Reintentar</Text></Pressable></View> : <>
      <GlassSurface style={[styles.stats, { borderColor: t.glassEdge }]}>{stats.map((item, index) => <View key={item.label} style={[styles.stat, index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.line }]}><Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text><Text style={[styles.statLabel, { color: t.muted }]}>{item.label}</Text></View>)}</GlassSurface>
    </>}
  </View>;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!user) return null;
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  async function handleLogout() {
    setLoading(true); setError('');
    try { await signOut(); } catch { setError('No se ha podido cerrar la sesión. Vuelve a intentarlo.'); } finally { setLoading(false); }
  }
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: t.canvas }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + (user.role === 'CITIZEN' ? 32 : 130) }}>
    <View style={styles.content}>
      <View style={styles.profileHeader}>
        {user.role === 'CITIZEN' && <Pressable accessibilityRole="button" accessibilityLabel="Volver a avisos" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={({ pressed }) => [styles.backButton, { backgroundColor: t.softAccent, opacity: pressed ? 0.7 : 1 }]}><SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={19} tintColor={t.accent} /></Pressable>}
        <Text accessibilityRole="header" style={[styles.heading, { color: t.ink }]}>Tu perfil</Text>
      </View>
      <GlassSurface style={[styles.identity, { borderColor: t.glassEdge }]}>
        <View style={[styles.avatar, { backgroundColor: t.softAccent }]}><Text style={[styles.initials, { color: t.accent }]}>{initials || '?'}</Text></View>
        <View style={styles.identityText}><Text selectable style={[styles.name, { color: t.ink }]}>{user.name}</Text><Text selectable style={[styles.email, { color: t.muted }]}>{user.email}</Text><Text style={[styles.role, { color: t.accent }]}>{roles[user.role]}</Text></View>
      </GlassSurface>
      {user.role === 'CITIZEN' && <CitizenStats />}
      <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: t.ink }]}>Cuenta</Text>{!!error && <Text accessibilityRole="alert" style={{ color: t.error }}>{error}</Text>}<Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={() => void handleLogout()} style={({ pressed }) => [styles.logout, { borderColor: t.line, backgroundColor: t.surface, opacity: pressed || loading ? 0.65 : 1 }]}>{loading ? <ActivityIndicator color={t.accent} /> : <Text style={[styles.link, { color: t.ink }]}>Cerrar sesión</Text>}</Pressable></View>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 28 }, profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, heading: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.6 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderWidth: 1, borderRadius: 20, borderCurve: 'continuous' }, avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }, initials: { fontSize: 22, fontWeight: '700' }, identityText: { flex: 1, gap: 4 }, name: { fontSize: 19, lineHeight: 25, fontWeight: '700' }, email: { fontSize: 14, lineHeight: 20 }, role: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  section: { gap: 12 }, sectionTitle: { fontSize: 19, fontWeight: '700' }, stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', paddingVertical: 18 }, stat: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 4 }, statValue: { fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] }, statLabel: { fontSize: 12, textAlign: 'center' }, action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, link: { fontSize: 15, fontWeight: '700' }, logout: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

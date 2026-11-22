import { SymbolView } from 'expo-symbols';
import { usePathname } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glass-surface';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

function CitizenTab({ label, icon, isFocused, ...props }: TabTriggerSlotProps & { label: string; icon: 'list' | 'add' | 'profile' }) {
  const theme = useTheme();
  const { user } = useAuth();
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isFocused }} style={({ pressed }) => [styles.tab, pressed && { opacity: 0.72 }]}>
    <View style={[styles.tabContent, isFocused && { backgroundColor: theme.glassSelected, borderColor: theme.glassEdge }, isFocused && styles.selected]}>
      {icon === 'add' ? <View style={[styles.add, { backgroundColor: theme.accentSurface }]}><SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor={theme.accentContrast} /></View> :
        icon === 'profile' && initials ? <View style={[styles.avatar, { backgroundColor: theme.softAccent }]}><ThemedText type="smallBold" style={{ color: theme.accent }}>{initials}</ThemedText></View> :
        <View style={styles.icon}><SymbolView name={icon === 'profile' ? { ios: 'person', android: 'person', web: 'person' } : { ios: 'list.bullet.rectangle', android: 'assignment', web: 'list' }} size={22} tintColor={isFocused ? theme.accent : theme.muted} /></View>}
      <ThemedText numberOfLines={1} style={[styles.label, { color: isFocused ? theme.accent : theme.muted }]}>{label}</ThemedText>
    </View>
  </Pressable>;
}

export default function BottomNavigation() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const pathname = usePathname();
  const citizen = user?.role === 'CITIZEN';
  return <Tabs>
    <TabSlot style={{ flex: 1 }} />
    <TabList asChild><GlassSurface refractive style={StyleSheet.flatten([styles.bar, { bottom: Math.max(insets.bottom, 12), borderColor: theme.glassEdge, display: citizen || pathname === '/report' ? 'none' : 'flex' }])}>
        <TabTrigger name="home" href="/" asChild><CitizenTab icon="list" label={user?.role === 'CITIZEN' ? 'Mis avisos' : 'Avisos'} /></TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild><CitizenTab icon="profile" label="Perfil" /></TabTrigger>
    </GlassSurface></TabList>
  </Tabs>;
}
const styles = StyleSheet.create({
  bar: { position: 'absolute', alignSelf: 'center', width: '92%', maxWidth: 440, height: 82, borderRadius: 42, borderCurve: 'continuous', borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 6, boxShadow: '0 12px 32px rgba(15, 56, 58, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.6)' },
  tab: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  tabContent: { flex: 1, minWidth: 0, borderRadius: 35, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: 'transparent' },
  selected: { boxShadow: '0 3px 10px rgba(15, 56, 58, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.45)' },
  icon: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  add: { width: 64, height: 34, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(15, 80, 70, 0.25)' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
});

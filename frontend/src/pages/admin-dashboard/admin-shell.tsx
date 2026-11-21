import { Link, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { FlatList, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/context/AuthContext';
import { AdminLogoutButton } from './admin-logout-button';
import { AdminIncidentsProvider, useAdminIncidents } from '@/pages/admin-dashboard/admin-incidents-context';
import { relativeTime } from '@/pages/admin-dashboard/analytics';
import { GlassPanel } from '@/pages/admin-dashboard/glass-panel';
import { incidentStatus, incidentStatusTone } from '@/pages/admin-dashboard/incident-status';
import { Reveal } from '@/pages/admin-dashboard/motion';
import { useAdminTheme } from '@/pages/admin-dashboard/theme';

const SIDEBAR_MARGIN = 12;
const SIDEBAR_WIDTH = 270;
const COMPACT_SIDEBAR_WIDTH = 64;
export const ADMIN_SIDEBAR_INSET = SIDEBAR_WIDTH + SIDEBAR_MARGIN * 2;
export const ADMIN_COMPACT_SIDEBAR_INSET = COMPACT_SIDEBAR_WIDTH + SIDEBAR_MARGIN * 2;

type IconName = 'home' | 'explore' | 'incidents' | 'profile';
const iconPaths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  explore: 'M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6',
  incidents: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  profile: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
};
function Icon({ name, color }: { name: IconName; color: string }) {
  return <View aria-hidden><Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d={iconPaths[name]} /></Svg></View>;
}

type NavLayout = { y: number; h: number };
const NavContext = createContext<{ report: (id: IconName, layout: NavLayout) => void; select: (id: IconName) => void } | null>(null);

type NavItemProps = { label: string; icon: IconName; href: Href; isFocused: boolean; compact: boolean };

function NavItem({ label, icon, href, isFocused, compact }: NavItemProps) {
  const theme = useAdminTheme();
  const nav = useContext(NavContext);
  const lift = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isFocused) return;
    nav?.select(icon);
    if (!reduceMotion) lift.set(withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 140 })));
  }, [isFocused, icon, nav, lift, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.get() }] }));
  const color = isFocused ? theme.accent : theme.muted;

  return (
    <Link href={href} dismissTo={compact} asChild>
      <Pressable
        nativeID={`admin-nav-${icon}${isFocused ? '-selected' : ''}`}
        role="tab"
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isFocused }}
        onLayout={(event: LayoutChangeEvent) => nav?.report(icon, { y: event.nativeEvent.layout.y, h: event.nativeEvent.layout.height })}
        style={{ minHeight: 48, paddingHorizontal: compact ? 0 : 16, borderRadius: 14, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', gap: 14 }}
      >
        <Animated.View style={iconStyle}><Icon name={icon} color={color} /></Animated.View>
        {!compact && <Text numberOfLines={1} style={{ color: isFocused ? theme.accent : theme.text, fontSize: 15, fontWeight: isFocused ? '700' : '600' }}>{label}</Text>}
      </Pressable>
    </Link>
  );
}

/** Agrupa la navegación y desliza una píldora de cristal hasta la pestaña activa. */
function NavGroup({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Partial<Record<IconName, NavLayout>>>({});
  const [active, setActive] = useState<IconName>('home');
  const placed = useRef(false);
  const top = useSharedValue(0);
  const height = useSharedValue(48);
  const stretch = useSharedValue(1);
  const visible = useSharedValue(0);

  const report = useCallback((id: IconName, layout: NavLayout) => {
    setLayouts((current) => (current[id]?.y === layout.y && current[id]?.h === layout.h ? current : { ...current, [id]: layout }));
  }, []);

  useEffect(() => {
    const target = layouts[active];
    if (!target) return;
    if (!placed.current || reduceMotion) {
      top.set(target.y);
      height.set(target.h);
      visible.set(1);
      placed.current = true;
      return;
    }
    const distance = Math.abs(target.y - top.get());
    // Deslizamiento corto y sin rebote: la píldora se estira apenas y se asienta de una vez.
    const slide = { duration: 220, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };
    top.set(withTiming(target.y, slide));
    height.set(withTiming(target.h, slide));
    if (distance > 0) stretch.set(withSequence(withTiming(1 + Math.min(distance / 900, 0.07), { duration: 90 }), withTiming(1, { duration: 130 })));
  }, [active, layouts, reduceMotion, top, height, stretch, visible]);

  const pill = useAnimatedStyle(() => ({ opacity: visible.get(), height: height.get(), transform: [{ translateY: top.get() }, { scaleY: stretch.get() }, { scaleX: 1 - (stretch.get() - 1) * 0.3 }] }));

  return (
    <NavContext.Provider value={{ report, select: setActive }}>
      <View accessibilityRole="tablist" accessibilityLabel="Navegación del operador" style={{ position: 'relative', gap: 4 }}>
        <Animated.View nativeID="admin-nav-pill" style={[{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, top: 0, borderRadius: 14, borderCurve: 'continuous' }, pill]} />
        {children}
      </View>
    </NavContext.Provider>
  );
}

function initials(name: string | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? 'A') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function SidebarHeader({ compact }: { compact: boolean }) {
  const theme = useAdminTheme();
  const { user } = useAuth();
  return (
    <View style={{ gap: compact ? 8 : 14, marginBottom: compact ? 10 : 18 }}>
      <View style={{ paddingHorizontal: 6, paddingTop: 6, alignItems: compact ? 'center' : 'flex-start' }}>
        <Text numberOfLines={1} accessibilityLabel="UrbanPulse" style={{ color: theme.text, fontSize: compact ? 16 : 20, fontWeight: '800', letterSpacing: -0.6 }}>{compact ? 'UP' : 'UrbanPulse'}</Text>
        {!compact && <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }}>GESTIÓN MUNICIPAL</Text>}
      </View>
      <View nativeID={compact ? undefined : 'admin-user-card'} style={compact ? undefined : { padding: 12, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, gap: 8 }}>
        <Link href="/operator/profile" dismissTo={compact} asChild>
          <Pressable nativeID="admin-user-link" accessibilityRole="link" accessibilityLabel="Abrir perfil" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', gap: 11, minHeight: 44 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 }}>{initials(user?.name)}</Text>
            </View>
            {!compact && <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{user?.name ?? 'Operador'}</Text>
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>Operador municipal</Text>
            </View>}
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function RecentIncidents() {
  const theme = useAdminTheme();
  const { state, retry } = useAdminIncidents();
  return (
    <View nativeID="admin-recent-incidents" accessibilityLabel="Incidencias recientes" style={{ flex: 1, minHeight: 0, paddingVertical: 8, paddingHorizontal: 4 }}>
      <FlatList
        nativeID="admin-recent-incidents-scroll"
        data={state.status === 'success' ? state.data : []}
        keyExtractor={(incident) => incident.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 2, paddingBottom: 28 }}
        ListEmptyComponent={
          <View>
            {state.status === 'loading' && <Text style={{ color: theme.muted, fontSize: 13, paddingHorizontal: 6 }}>Cargando incidencias…</Text>}
            {state.status === 'error' && (
              <View style={{ paddingHorizontal: 6 }}>
                <Text accessibilityRole="alert" style={{ color: theme.muted }}>No se han podido cargar.</Text>
                <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.accent, fontWeight: '700' }}>Reintentar</Text></Pressable>
              </View>
            )}
            {state.status === 'success' && <Text style={{ color: theme.muted, paddingHorizontal: 6 }}>Aún no hay incidencias.</Text>}
          </View>
        }
        renderItem={({ item: incident, index }) => {
          const title = incident.title?.trim() || 'Incidencia sin título';
          const row = (
            <Link href={`/operator/incident/${incident.id}`} asChild>
              <Pressable nativeID={`admin-sidebar-incident-${incident.id}`} accessibilityRole="link" accessibilityLabel={`${title}, ${incidentStatus(incident.status)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 11, borderCurve: 'continuous' }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme[incidentStatusTone(incident.status)] }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{title}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>{incidentStatus(incident.status)} · {relativeTime(incident.registeredAt)}</Text>
                </View>
              </Pressable>
            </Link>
          );
          return index < 5 ? <Reveal index={index + 3} distance={8}>{row}</Reveal> : row;
        }}
      />
    </View>
  );
}

const items = [['home', 'Inicio', '/operator'], ['explore', 'Mapa', '/operator/map'], ['incidents', 'Incidencias', '/operator/incidents']] as const;

export function AdminWorkspace({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const compact = pathname.startsWith('/operator/incident/');
  const activePath = compact ? (from === 'map' ? '/operator/map' : '/operator/incidents') : pathname;
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(compact ? COMPACT_SIDEBAR_WIDTH : SIDEBAR_WIDTH);

  useEffect(() => {
    const target = compact ? COMPACT_SIDEBAR_WIDTH : SIDEBAR_WIDTH;
    width.set(reduceMotion ? target : withTiming(target, { duration: 300, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, [compact, reduceMotion, width]);

  const rail = useAnimatedStyle(() => ({ width: width.get() }));

  return (
    <AdminIncidentsProvider>
      <View nativeID="admin-canvas" style={{ flex: 1 }}>
        {children}
        <Animated.View style={[{ position: 'absolute', left: SIDEBAR_MARGIN, top: SIDEBAR_MARGIN, bottom: SIDEBAR_MARGIN, zIndex: 8 }, rail]}>
          <GlassPanel nativeID={compact ? 'admin-tab-rail' : 'admin-tab-list'} radius={24} style={{ flex: 1, minHeight: 0 }}>
            <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 24, padding: compact ? 8 : 18 }}>
              <SidebarHeader compact={compact} />
              <NavGroup>
                {items.map(([icon, label, href]) => <NavItem key={icon} icon={icon} label={label} href={href} isFocused={href === activePath} compact={compact} />)}
              </NavGroup>
              <View style={{ flex: 1, minHeight: 0, display: compact ? 'none' : 'flex' }}><RecentIncidents /></View>
              {compact && <View style={{ flex: 1 }} />}
              <AdminLogoutButton placement="sidebar" compact={compact} />
            </View>
          </GlassPanel>
        </Animated.View>
      </View>
    </AdminIncidentsProvider>
  );
}

export default function AdminShell() {
  // El mapa ocupa toda la pantalla y la barra lateral flota sobre él.
  const fullBleed = usePathname() === '/operator/map';
  return (
    <Tabs>
      <TabSlot style={{ flex: 1, minWidth: 0, marginLeft: fullBleed ? 0 : ADMIN_SIDEBAR_INSET, backgroundColor: 'transparent' }} />
      <TabList style={{ display: 'none' }}>
        {items.map(([icon, , href]) => <TabTrigger key={icon} name={icon} href={href} />)}
        <TabTrigger name="profile" href="/operator/profile" />
      </TabList>
    </Tabs>
  );
}

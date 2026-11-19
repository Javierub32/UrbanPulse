import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/context/AuthContext';
import { categories } from '@/pages/report/services/report-service';
import type { IncidentListItem } from '@/types/incidents';
import { ActivityChart } from './activity-chart';
import { buildSeries, greeting, relativeTime, share, summarize } from './analytics';
import { monotonePath } from './chart-geometry';
import { useAdminIncidents } from './admin-incidents-context';
import { Ping, Reveal, Skeleton, useFocusProgress } from './motion';
import { StatusPill } from './status-pill';
import { useAdminTheme } from './theme';

const metricStyles = {
  'Total': { color: '#176C82', dark: '#5CC4DE', icon: 'total' },
  'Pendientes': { color: '#B43E49', dark: '#FF8589', icon: 'clock' },
  'En gestión': { color: '#9A650D', dark: '#E9B55D', icon: 'work' },
  'Finalizadas': { color: '#168063', dark: '#75D4A9', icon: 'done' },
  'Últimos 7 días': { color: '#6553AD', dark: '#B3A4F2', icon: 'calendar' },
} as const;
type MetricLabel = keyof typeof metricStyles;

function MetricIcon({ icon, color }: { icon: (typeof metricStyles)[MetricLabel]['icon']; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
      {icon === 'total' && <><Rect x={6} y={6} width={15} height={15} rx={4} /><Rect x={27} y={6} width={15} height={15} rx={4} /><Rect x={6} y={27} width={15} height={15} rx={4} /><Rect x={27} y={27} width={15} height={15} rx={4} /></>}
      {icon === 'clock' && <><Circle cx={24} cy={24} r={18} /><Path d="M24 13v12l8 5" /></>}
      {icon === 'work' && <><Circle cx={24} cy={24} r={18} /><Path d="M16 23h16M24 15v16" /></>}
      {icon === 'done' && <><Circle cx={24} cy={24} r={18} /><Path d="m15 24 6 6 12-13" /></>}
      {icon === 'calendar' && <><Rect x={7} y={10} width={34} height={31} rx={5} /><Path d="M15 6v8M33 6v8M7 19h34" /></>}
    </Svg>
  );
}

function Sparkline({ values, color, progress }: { values: number[]; color: string; progress: number }) {
  const [width, setWidth] = useState(120);
  const height = 30;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => ({ x: 2 + ((width - 4) * index) / (values.length - 1), y: height - 3 - (value / max) * (height - 8) }));
  const line = monotonePath(points);
  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height, opacity: progress }}>
      <Svg width={width} height={height}>
        <Defs><LinearGradient id="ap-spark" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity={0.28} /><Stop offset="1" stopColor={color} stopOpacity={0} /></LinearGradient></Defs>
        <Path d={`${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`} fill="url(#ap-spark)" />
        <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
      </Svg>
    </View>
  );
}

type MetricProps = {
  label: MetricLabel;
  value: number;
  detail: string;
  order: number;
  footer: { kind: 'spark'; values: number[] } | { kind: 'share'; percent: number } | { kind: 'delta'; delta: number | null };
  attention?: boolean;
};

function Metric({ label, value, detail, order, footer, attention }: MetricProps) {
  const theme = useAdminTheme();
  const style = metricStyles[label];
  const color = useColorScheme() === 'dark' ? style.dark : style.color;
  const icon = style.icon;
  const progress = useFocusProgress(950, 160 + order * 70, value);
  return (
    <Reveal index={order + 1} style={{ flexGrow: 1, flexBasis: 170, minWidth: 150 }}>
      <View nativeID={`admin-metric-${label.replaceAll(' ', '-')}`} accessibilityLabel={`${label}: ${value}. ${detail}`} style={{ flex: 1, padding: 16, minHeight: 148, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 30, height: 30, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}1A` }}>
            <MetricIcon icon={icon} color={color} />
          </View>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, fontWeight: '700', flex: 1 }}>{label}</Text>
          {attention && <Ping color={theme.danger} />}
        </View>
        <Text selectable style={{ color, fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{Math.round(value * progress).toLocaleString('es-ES')}</Text>
        <View style={{ marginTop: 'auto', gap: 7 }}>
          {footer.kind === 'spark' && <Sparkline values={footer.values} color={color} progress={progress} />}
          {footer.kind === 'share' && (
            <View style={{ gap: 5 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.track, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 3, width: `${footer.percent * progress}%`, backgroundColor: color }} />
              </View>
              <Text style={{ color, fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{footer.percent} % del total</Text>
            </View>
          )}
          {footer.kind === 'delta' && (
            <Text style={{ color: footer.delta === null ? theme.muted : color, fontSize: 11, fontWeight: '800', opacity: progress }}>
              {footer.delta === null ? 'Sin semana anterior' : `${footer.delta > 0 ? '↑' : footer.delta < 0 ? '↓' : '→'} ${Math.abs(footer.delta)} % vs. semana anterior`}
            </Text>
          )}
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>{detail}</Text>
        </View>
      </View>
    </Reveal>
  );
}

function categoryLabel(value: string | null) {
  return categories.find((item) => item.value === value)?.label ?? value ?? 'Sin categoría';
}

function IncidentRow({ incident }: { incident: IncidentListItem }) {
  const theme = useAdminTheme();
  return (
    <Link href={`/operator/incident/${incident.id}`} asChild>
      <Pressable nativeID={`admin-dashboard-incident-${incident.id}`} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: 12, borderCurve: 'continuous' }}>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{incident.title?.trim() || 'Incidencia sin título'}</Text>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{categoryLabel(incident.category)} · {relativeTime(incident.registeredAt)}</Text>
        </View>
        <StatusPill status={incident.status} />
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={theme.muted} />
      </Pressable>
    </Link>
  );
}

function Card({ children, order, style, ...props }: { children: React.ReactNode; order: number; style?: object; nativeID?: string }) {
  const theme = useAdminTheme();
  return (
    <Reveal index={order} style={style}>
      <View {...props} style={{ flex: 1, minWidth: 0, backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, borderWidth: 1, borderColor: theme.border, gap: 14 }}>{children}</View>
    </Reveal>
  );
}

function CardTitle({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  const theme = useAdminTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{hint}</Text>
      </View>
      {action}
    </View>
  );
}

function StatusBreakdown({ pending, inProgress, finished, total }: { pending: number; inProgress: number; finished: number; total: number }) {
  const theme = useAdminTheme();
  const progress = useFocusProgress(900, 520, total);
  const groups = [
    { label: 'Pendientes', count: pending, color: theme.danger },
    { label: 'En gestión', count: inProgress, color: theme.warning },
    { label: 'Finalizadas', count: finished, color: theme.success },
  ];
  return (
    <View style={{ gap: 18 }}>
      <View accessibilityRole="image" accessibilityLabel={groups.map((group) => `${group.label} ${group.count}`).join(', ')} style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: theme.track, gap: 2 }}>
        {groups.map((group) => group.count > 0 && <View key={group.label} style={{ flex: group.count * Math.max(progress, 0.001), backgroundColor: group.color }} />)}
        <View style={{ flex: Math.max(0.0001, total * (1 - progress)) }} />
      </View>
      <View style={{ gap: 10 }}>
        {groups.map((group) => (
          <View key={group.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.color }} />
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{group.label}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontVariant: ['tabular-nums'] }}>{share(group.count, total)} %</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{group.count.toLocaleString('es-ES')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryBreakdown({ items }: { items: { value: string; count: number }[] }) {
  const theme = useAdminTheme();
  const progress = useFocusProgress(900, 600, items.length);
  const top = items.slice(0, 5);
  const max = Math.max(1, ...top.map((item) => item.count));
  if (top.length === 0) return <Text style={{ color: theme.muted, fontSize: 13 }}>Todavía no hay categorías que comparar.</Text>;
  return (
    <View style={{ gap: 13 }}>
      {top.map((item) => (
        <View key={item.value} accessibilityLabel={`${categoryLabel(item.value)}: ${item.count}`} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{categoryLabel(item.value)}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{item.count.toLocaleString('es-ES')}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.track, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, width: `${(item.count / max) * 100 * progress}%`, backgroundColor: theme.accent }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function LoadingState({ wide }: { wide: boolean }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando resumen de incidencias" style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} style={{ flexGrow: 1, flexBasis: 170, minWidth: 150, height: 148, borderRadius: 18 }} />)}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
        <Skeleton style={{ flex: wide ? 1.1 : undefined, height: 360, borderRadius: 20 }} />
        <Skeleton style={{ flex: wide ? 1.4 : undefined, height: 360, borderRadius: 22 }} />
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const theme = useAdminTheme();
  const { user } = useAuth();
  const { state, retry } = useAdminIncidents();
  const { width } = useWindowDimensions();
  const incidents = useMemo(() => (state.status === 'success' ? state.data : []), [state]);
  const summary = useMemo(() => summarize(incidents), [incidents]);
  const week = useMemo(() => buildSeries(incidents, 7), [incidents]);
  const fortnight = useMemo(() => buildSeries(incidents, 14), [incidents]);
  const wide = width >= 1260;
  const firstName = user?.name.trim().split(/\s+/)[0] || 'operador';
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const pendingCount = summary.pending.length;
  const subtitle = state.status !== 'success'
    ? 'Consulta el estado de las incidencias de la ciudad.'
    : pendingCount === 0 ? 'Todo al día: no hay incidencias pendientes de atención.'
      : `${pendingCount.toLocaleString('es-ES')} ${pendingCount === 1 ? 'incidencia espera' : 'incidencias esperan'} atención.`;

  return (
    <ScrollView nativeID="admin-dashboard-canvas" style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: width >= 1100 ? 42 : 26, paddingTop: 38, paddingBottom: 64, gap: 24 }}>
      <Reveal index={0}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{today}</Text>
            <Text style={{ color: theme.text, fontSize: width >= 1100 ? 36 : 30, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 }}>{greeting()}, {firstName}</Text>
            <Text style={{ color: theme.muted, fontSize: 15 }}>{subtitle}</Text>
          </View>
          <Link href="/operator/profile" asChild>
            <Pressable nativeID="admin-settings-button" accessibilityRole="link" accessibilityLabel="Ajustes" style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface }}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Circle cx={12} cy={12} r={3} /><Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4m0-13.4-1.4 1.4M6.7 17.3l-1.4 1.4" /><Circle cx={12} cy={12} r={7.3} /></Svg>
            </Pressable>
          </Link>
        </View>
      </Reveal>

      {state.status === 'loading' ? (
        <LoadingState wide={wide} />
      ) : state.status === 'error' ? (
        <Reveal index={1}>
          <View style={{ backgroundColor: theme.surface, padding: 26, borderRadius: 20, gap: 12 }}>
            <Text accessibilityRole="alert" style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>No se ha podido cargar el dashboard</Text>
            <Text style={{ color: theme.muted }}>{state.message}</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Reintentar</Text>
            </Pressable>
          </View>
        </Reveal>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Metric order={0} label="Total" value={summary.total} detail="Incidencias registradas" footer={{ kind: 'spark', values: fortnight.days.map((day) => day.count) }} />
            <Metric order={1} label="Pendientes" value={pendingCount} detail="Registradas o reabiertas" footer={{ kind: 'share', percent: share(pendingCount, summary.total) }} attention={pendingCount > 0} />
            <Metric order={2} label="En gestión" value={summary.inProgress.length} detail="Validadas, asignadas o en curso" footer={{ kind: 'share', percent: share(summary.inProgress.length, summary.total) }} />
            <Metric order={3} label="Finalizadas" value={summary.finished.length} detail="Resueltas, cerradas o rechazadas" footer={{ kind: 'share', percent: share(summary.finished.length, summary.total) }} />
            <Metric order={4} label="Últimos 7 días" value={week.total} detail="Incidencias nuevas" footer={{ kind: 'delta', delta: week.delta }} />
          </View>

          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
            <Card nativeID="admin-attention-card" order={6} style={{ flex: wide ? 1.1 : undefined, minWidth: 0 }}>
              <CardTitle title="Pendientes de atención" hint="Incidencias registradas o reabiertas" action={<Link href="/operator/incidents" style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>Ver todas</Link>} />
              {pendingCount === 0 ? (
                <View style={{ paddingVertical: 42, gap: 6 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>Todo al día</Text>
                  <Text style={{ color: theme.muted, fontSize: 13 }}>No hay incidencias registradas o reabiertas pendientes.</Text>
                </View>
              ) : (
                <View>{summary.pending.slice(0, 5).map((incident) => <IncidentRow key={incident.id} incident={incident} />)}</View>
              )}
            </Card>
            <Reveal index={7} style={{ flex: wide ? 1.4 : undefined, minWidth: 0 }}>
              <ActivityChart incidents={incidents} />
            </Reveal>
          </View>

          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
            <Card nativeID="admin-card-status" order={8} style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <CardTitle title="Reparto por estado" hint="Cómo se distribuye el trabajo" />
              <StatusBreakdown pending={pendingCount} inProgress={summary.inProgress.length} finished={summary.finished.length} total={summary.total} />
            </Card>
            <Card nativeID="admin-card-categories" order={9} style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <CardTitle title="Categorías más frecuentes" hint="Dónde se concentran los avisos" />
              <CategoryBreakdown items={summary.byCategory} />
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

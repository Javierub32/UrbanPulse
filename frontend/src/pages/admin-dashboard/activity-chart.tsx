import { useMemo, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { IncidentSummary } from '@/services/incidents-service';
import { SPANS, buildSeries, type Span } from './analytics';
import { monotonePath, niceMax } from './chart-geometry';
import { useFocusProgress } from './motion';
import { useAdminTheme } from './theme';

const HEIGHT = 208;
const PAD = { left: 30, right: 14, top: 16, bottom: 28 };

function plural(count: number) {
  return `${count.toLocaleString('es-ES')} ${count === 1 ? 'incidencia' : 'incidencias'}`;
}

function SpanSwitch({ span, onChange }: { span: Span; onChange: (span: Span) => void }) {
  const theme = useAdminTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 3, borderRadius: 12, borderCurve: 'continuous', backgroundColor: theme.track }}>
      {SPANS.map((option) => {
        const selected = option === span;
        return (
          <Pressable
            key={option}
            nativeID={`admin-span-${option}`}
            accessibilityRole="tab"
            accessibilityLabel={`Últimos ${option} días`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={{ minHeight: 32, paddingHorizontal: 12, borderRadius: 9, borderCurve: 'continuous', justifyContent: 'center', backgroundColor: selected ? theme.surface : 'transparent' }}
          >
            <Text style={{ color: selected ? theme.accent : theme.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{option} d</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActivityChart({ byDay }: { byDay: IncidentSummary['byDay'] }) {
  const theme = useAdminTheme();
  const [span, setSpan] = useState<Span>(7);
  const [width, setWidth] = useState(560);
  const [active, setActive] = useState<number | null>(null);
  const series = useMemo(() => buildSeries(byDay, span), [byDay, span]);
  const progress = useFocusProgress(1100, 260, span);
  const shownTotal = Math.round(series.total * progress);

  const { days } = series;
  const count = days.length;
  const plotW = Math.max(120, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...days.map((day) => day.count)));
  const points = days.map((day, index) => ({ x: PAD.left + (plotW * index) / (count - 1), y: PAD.top + plotH - (day.count / max) * plotH }));
  const line = monotonePath(points);
  const baseline = PAD.top + plotH;
  const area = `${line} L ${points[count - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  const step = plotW / (count - 1);
  const labelEvery = span === 7 ? 1 : span === 14 ? 2 : 5;
  const ticks = [0, max / 2, max];
  const hovered = active === null ? null : { day: days[active], point: points[active] };
  const tooltipLeft = hovered ? Math.min(Math.max(hovered.point.x - 66, 6), Math.max(6, width - 138)) : 0;
  const tooltipTop = hovered ? Math.max(hovered.point.y - 64, 0) : 0;

  return (
    <View nativeID="admin-card-chart" style={{ flex: 1, minWidth: 0, minHeight: 360, backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 24, borderWidth: 1, borderColor: theme.border, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>Nuevas incidencias</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Registros de los últimos {span} días</Text>
        </View>
        <SpanSwitch span={span} onChange={(next) => { setSpan(next); setActive(null); }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <Text accessibilityLabel={plural(series.total)} style={{ color: theme.text, fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>{shownTotal.toLocaleString('es-ES')}</Text>
        {series.delta === null ? (
          <Text style={{ color: theme.muted, fontSize: 12 }}>Sin periodo anterior con el que comparar</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${series.delta > 0 ? theme.warning : theme.success}1F` }}>
              <Text style={{ color: series.delta > 0 ? theme.warning : theme.success, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                {series.delta > 0 ? '↑' : series.delta < 0 ? '↓' : '→'} {Math.abs(series.delta)} %
              </Text>
            </View>
            <Text style={{ color: theme.muted, fontSize: 12 }}>respecto a los {span} días anteriores</Text>
          </View>
        )}
      </View>

      <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT, marginTop: 4 }}>
        <Svg width={width} height={HEIGHT} accessibilityLabel={`Incidencias nuevas por día: ${days.map((day) => `${day.weekday} ${day.day} ${day.count}`).join(', ')}`}>
          <Defs>
            <LinearGradient id="ap-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.accent} stopOpacity={0.2} />
              <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
            </LinearGradient>
            <ClipPath id="ap-reveal"><Rect x={0} y={0} width={PAD.left + plotW * progress + 8} height={HEIGHT} /></ClipPath>
          </Defs>

          {ticks.map((tick) => {
            const y = PAD.top + plotH - (tick / max) * plotH;
            return (
              <G key={tick}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke={theme.text} strokeOpacity={tick === 0 ? 0.22 : 0.1} strokeDasharray={tick === 0 ? undefined : '3 7'} />
                <SvgText x={PAD.left - 10} y={y + 4} fill={theme.muted} fontSize={10} textAnchor="end">{tick}</SvgText>
              </G>
            );
          })}

          {hovered && <Line x1={hovered.point.x} x2={hovered.point.x} y1={PAD.top} y2={baseline} stroke={theme.text} strokeOpacity={0.3} strokeDasharray="2 4" />}

          <G clipPath="url(#ap-reveal)">
            <Path d={area} fill="url(#ap-area)" />
            <Path d={line} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </G>

          {days.map((day, index) => {
            const isEdge = index === count - 1;
            const isActive = index === active;
            if (!isEdge && !isActive && span !== 7) return null;
            return (
              <G key={day.key} opacity={progress > 0.92 ? 1 : 0}>
                {(isEdge || isActive) && <Circle cx={points[index].x} cy={points[index].y} r={isActive ? 11 : 9} fill={theme.accent} fillOpacity={0.16} />}
                <Circle cx={points[index].x} cy={points[index].y} r={isActive || isEdge ? 5 : 3.5} fill={isActive || isEdge ? theme.surface : theme.accent} stroke={theme.accent} strokeWidth={isActive || isEdge ? 2.5 : 0} />
              </G>
            );
          })}

          {days.map((day, index) => (index % labelEvery === 0 || index === count - 1) && (index === count - 1 || count - 1 - index >= labelEvery) ? (
            <SvgText key={day.key} x={points[index].x} y={HEIGHT - 6} fill={index === active ? theme.text : theme.muted} fontSize={11} fontWeight={index === active || index === count - 1 ? '700' : '400'} textAnchor="middle">
              {span === 7 ? day.weekday : day.day}
            </SvgText>
          ) : null)}
        </Svg>

        <View style={{ position: 'absolute', top: 0, height: HEIGHT, left: PAD.left - step / 2, width: plotW + step, flexDirection: 'row' }}>
          {days.map((day, index) => (
            <Pressable
              key={day.key}
              accessibilityLabel={`${day.weekday} ${day.day} ${day.month}: ${plural(day.count)}`}
              onHoverIn={() => setActive(index)}
              onHoverOut={() => setActive((current) => (current === index ? null : current))}
              onPress={() => setActive((current) => (current === index ? null : index))}
              style={{ flex: 1, height: HEIGHT }}
            />
          ))}
        </View>

        {hovered && (
          <View pointerEvents="none" style={{ position: 'absolute', left: tooltipLeft, top: tooltipTop, minWidth: 132, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: theme.text, gap: 2 }}>
            <Text style={{ color: theme.surface, opacity: 0.72, fontSize: 11 }}>{hovered.day.weekday} {hovered.day.day} {hovered.day.month}</Text>
            <Text style={{ color: theme.surface, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{plural(hovered.day.count)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

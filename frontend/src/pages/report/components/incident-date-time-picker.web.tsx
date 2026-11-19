import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { TimeWheel } from './time-wheel.web';

type Props = { value: Date; onChange: (value: Date) => void; disabled?: boolean };
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export default function IncidentDateTimePicker({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const moveMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const changeDay = (day: number) => { const next = new Date(value); next.setFullYear(month.getFullYear(), month.getMonth(), day); onChange(next); };
  return <View style={{ gap: 16 }}>
    <View style={[styles.calendar, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.calendarHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" disabled={disabled} onPress={() => moveMonth(-1)} style={styles.arrow}><SymbolView name={{ ios: 'chevron.left', web: 'chevron_left' }} size={20} tintColor={theme.accent} /></Pressable><Text style={[styles.month, { color: theme.ink }]}>{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" disabled={disabled} onPress={() => moveMonth(1)} style={styles.arrow}><SymbolView name={{ ios: 'chevron.right', web: 'chevron_right' }} size={20} tintColor={theme.accent} /></Pressable></View>
      <View style={styles.grid}>{weekdays.map((day, index) => <Text key={index} style={[styles.weekday, { color: theme.muted }]}>{day}</Text>)}{Array.from({ length: first }, (_, index) => <View key={`blank-${index}`} style={styles.dayCell} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const selected = value.getFullYear() === month.getFullYear() && value.getMonth() === month.getMonth() && value.getDate() === day; return <View style={styles.dayCell} key={day}><Pressable accessibilityRole="button" accessibilityLabel={`${day} de ${month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`} accessibilityState={{ selected }} disabled={disabled} onPress={() => changeDay(day)} style={[styles.day, selected && { backgroundColor: theme.accentSurface }]}><Text style={{ color: selected ? theme.accentContrast : theme.ink, fontWeight: selected ? '700' : '500' }}>{day}</Text></Pressable></View>; })}</View>
    </View>
    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.ink }}>Hora</Text>
    <TimeWheel value={value} onChange={onChange} disabled={disabled} />
  </View>;
}
const styles = StyleSheet.create({ calendar: { borderRadius: 18, borderWidth: 1, padding: 12 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, month: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 8, fontSize: 12, fontWeight: '700' }, dayCell: { width: '14.2857%', alignItems: 'center' }, day: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' } });

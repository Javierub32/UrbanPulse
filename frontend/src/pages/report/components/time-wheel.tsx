import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: Date; onChange: (value: Date) => void; disabled?: boolean };
type ColumnProps = { label: string; value: number; count: number; disabled?: boolean; onChange: (value: number) => void };
const ITEM_HEIGHT = 44;

function WheelColumn({ label, value, count, disabled, onChange }: ColumnProps) {
  const theme = useTheme();
  const list = useRef<ScrollView>(null);
  const initialValue = useRef(value);
  const ready = useRef(false);
  const position = useRef(count + value);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ready.current || disabled) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    position.current = index;
    const next = ((index % count) + count) % count;
    if (next !== value) onChange(next);
    if (index < count / 2 || index >= count * 2.5) { position.current = count + next; list.current?.scrollTo({ y: position.current * ITEM_HEIGHT, animated: false }); }
  };
  const select = (direction: number) => {
    const next = (value + direction + count) % count;
    onChange(next);
    list.current?.scrollTo({ y: (position.current + direction) * ITEM_HEIGHT, animated: true });
  };
  return <ScrollView ref={list} style={styles.column} contentContainerStyle={styles.columnContent} showsVerticalScrollIndicator={false} nestedScrollEnabled scrollEnabled={!disabled} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16} onLayout={() => { if (!ready.current) { list.current?.scrollTo({ y: (count + initialValue.current) * ITEM_HEIGHT, animated: false }); ready.current = true; } }} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: count - 1, now: value, text: String(value).padStart(2, '0') }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => select(event.nativeEvent.actionName === 'increment' ? 1 : -1)}>
    {Array.from({ length: count * 3 }, (_, index) => { const number = index % count; const distance = Math.min(Math.abs(number - value), count - Math.abs(number - value)); return <View key={index} style={styles.item}><Text style={{ color: theme.ink, opacity: distance === 0 ? 1 : distance === 1 ? 0.52 : 0.25, fontSize: 23, fontWeight: distance === 0 ? '600' : '400', fontVariant: ['tabular-nums'] }}>{String(number).padStart(2, '0')}</Text></View>; })}
  </ScrollView>;
}
export function TimeWheel({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const changeTime = (part: 'hours' | 'minutes', number: number) => { const next = new Date(value); if (part === 'hours') next.setHours(number); else next.setMinutes(number); next.setSeconds(0, 0); onChange(next); };
  return <View style={[styles.wheel, { backgroundColor: theme.surface }]}>
    <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundElement }]} />
    <WheelColumn label="Horas" value={value.getHours()} count={24} disabled={disabled} onChange={number => changeTime('hours', number)} />
    <WheelColumn label="Minutos" value={value.getMinutes()} count={60} disabled={disabled} onChange={number => changeTime('minutes', number)} />
  </View>;
}
const styles = StyleSheet.create({ wheel: { width: '100%', maxWidth: 280, height: 220, alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', borderRadius: 18, overflow: 'hidden' }, highlight: { position: 'absolute', left: 12, right: 12, top: 88, height: 44, borderRadius: 10 }, column: { flex: 1, maxWidth: 125, height: 220 }, columnContent: { paddingVertical: 88 }, item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' } });

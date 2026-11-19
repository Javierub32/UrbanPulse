import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Platform, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TimeWheel } from './time-wheel';

type Props = { value: Date; onChange: (value: Date) => void; disabled?: boolean };
export default function IncidentDateTimePicker({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const update = (selected: Date, mode: 'date' | 'time') => {
    const next = new Date(value);
    if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };
  return <View style={{ gap: 18 }}>
    <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: theme.surface, padding: 8 }}>
      <DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} presentation="inline" value={value} disabled={disabled} locale="es_ES" accentColor={theme.accent} onValueChange={(_event, selected) => update(selected, 'date')} />
    </View>
    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.ink }}>Hora</Text>
    {Platform.OS === 'ios' ? <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: theme.surface, alignItems: 'center' }}>
      <DateTimePicker mode="time" display="spinner" presentation="inline" value={value} disabled={disabled} locale="es_ES" is24Hour accentColor={theme.accent} onValueChange={(_event, selected) => update(selected, 'time')} />
    </View> : <TimeWheel value={value} onChange={onChange} disabled={disabled} />}
  </View>;
}

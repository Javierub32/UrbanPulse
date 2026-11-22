import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { localDateString, parseLocalDay } from '../incident-filters';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const date = parseLocalDay(value);
  return <View style={{ flex: 1, minWidth: 130, gap: 6 }}>
    <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${date?.toLocaleDateString('es-ES') ?? 'Seleccionar fecha'}`} onPress={() => setOpen(!open)} style={{ minHeight: 48, borderRadius: 14, backgroundColor: theme.backgroundElement, paddingHorizontal: 14, justifyContent: 'center' }}>
      <Text style={{ color: theme.ink }}>{date?.toLocaleDateString('es-ES') ?? 'Seleccionar fecha'}</Text>
    </Pressable>
    {open && <DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} presentation={Platform.OS === 'android' ? 'dialog' : 'inline'} value={date ?? new Date()} accentColor={theme.accent} onValueChange={(_event, selected) => { onChange(localDateString(selected)); setOpen(false); }} onDismiss={() => setOpen(false)} />}
  </View>;
}

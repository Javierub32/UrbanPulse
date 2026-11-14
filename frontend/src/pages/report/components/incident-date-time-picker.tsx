import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IncidentDateTimePickerProps = {
  value: Date;
  onChange: (value: Date) => void;
  disabled?: boolean;
};

export default function IncidentDateTimePicker({ value, onChange, disabled }: IncidentDateTimePickerProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const dateLabel = value.toLocaleDateString('es-ES');
  const timeLabel = value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  function updateValue(selected: Date) {
    const next = new Date(value);
    if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    if (mode === 'time') next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
    setMode(null);
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {(['date', 'time'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={item === 'date' ? `Fecha: ${dateLabel}` : `Hora: ${timeLabel}`}
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => setMode(item)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: Spacing.three,
              borderRadius: 12,
              backgroundColor: theme.backgroundElement,
              opacity: disabled ? 0.5 : pressed ? 0.65 : 1,
            })}
          >
            <ThemedText type="smallBold" selectable={false}>
              {item === 'date' ? dateLabel : timeLabel}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {mode && (
        <DateTimePicker
          mode={mode}
          value={value}
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
          is24Hour
          accentColor={theme.accent}
          onValueChange={(_event, selected) => updateValue(selected)}
          onDismiss={() => setMode(null)}
        />
      )}
    </View>
  );
}

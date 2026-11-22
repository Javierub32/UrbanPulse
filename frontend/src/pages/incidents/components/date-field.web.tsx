import { createElement } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return <View style={{ flex: 1, minWidth: 130, gap: 6 }}><Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>{createElement('input', { type: 'date', 'aria-label': label, value, onInput: (event: { currentTarget: { value: string } }) => onChange(event.currentTarget.value), style: { boxSizing: 'border-box', width: '100%', minHeight: 48, border: 0, borderRadius: 14, backgroundColor: theme.backgroundElement, color: theme.ink, padding: '0 12px', font: 'inherit' } })}</View>;
}

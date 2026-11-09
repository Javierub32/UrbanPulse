import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Option = { value: string; label: string };
export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const selected = options.find(option => option.value === value)?.label ?? 'Todas';
  return <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
    <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderCurve: 'continuous', backgroundColor: theme.backgroundElement, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <ThemedText numberOfLines={1} style={{ flex: 1 }}>{selected}</ThemedText><ThemedText style={{ color: theme.accent }}>⌄</ThemedText>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.three }}>
        <Pressable accessibilityLabel="Cerrar filtros" onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
        <View accessibilityViewIsModal style={{ maxHeight: '75%', width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: theme.background, borderRadius: 18, borderCurve: 'continuous', padding: Spacing.three, gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><ThemedText type="smallBold">{label}</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setOpen(false)} hitSlop={12}><ThemedText type="linkPrimary">Cerrar</ThemedText></Pressable></View>
          <ScrollView>{[{ value: '', label: 'Todas' }, ...options].map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} onPress={() => { onChange(option.value); setOpen(false); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: value === option.value ? theme.backgroundElement : 'transparent' }}><ThemedText>{option.label}</ThemedText>{value === option.value && <ThemedText style={{ color: theme.accent }}>✓</ThemedText>}</Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

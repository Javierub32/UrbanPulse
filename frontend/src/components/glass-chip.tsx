import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type AccessibilityRole } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { useTheme } from '@/hooks/use-theme';

type GlassChipProps = {
  label: string;
  onPress: () => void;
  /** Con `selected` definido la píldora actúa como opción (radio); sin él, como botón. */
  selected?: boolean;
  refractive?: boolean;
  /** Cristal más transparente, para controles que flotan directamente sobre el mapa. */
  clear?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  nativeID?: string;
  children?: ReactNode;
};

/** Píldora de cristal de los filtros: la comparten la app ciudadana y el panel municipal. */
export function GlassChip({ label, onPress, selected, refractive = false, clear = false, accessibilityRole, accessibilityLabel, accessibilityHint, nativeID, children }: GlassChipProps) {
  const t = useTheme();
  const option = selected !== undefined;
  return (
    <Pressable
      nativeID={nativeID}
      accessibilityRole={accessibilityRole ?? (option ? 'radio' : 'button')}
      accessibilityState={option ? { checked: selected } : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <GlassSurface refractive={refractive} style={[styles.chip, { backgroundColor: selected ? t.filterGlassActive : clear ? t.filterGlassClear : t.filterGlass, borderColor: t.glassEdge }]}>
        <Text style={[styles.chipText, { color: selected ? t.accentContrast : t.ink }]}>{label}</Text>
        {children}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, borderRadius: 22, paddingHorizontal: 14, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', boxShadow: '0 3px 10px rgba(15, 56, 58, 0.08)' },
  chipText: { fontSize: 13, fontWeight: '600' },
});

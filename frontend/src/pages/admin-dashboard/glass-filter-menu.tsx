import { Check, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { GlassChip } from '@/components/glass-chip';
import { GlassSurface } from '@/components/glass-surface';
import { useTheme } from '@/hooks/use-theme';

export type GlassFilterOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
  badge?: { text: string; accessibilityLabel: string };
};
type GlassFilterMenuProps = {
  id: string;
  label: string;
  value: string;
  options: readonly GlassFilterOption[];
  onChange: (value: string) => void;
  align?: 'left' | 'right';
  emptyLabel?: string;
  field?: { open: boolean; onOpenChange: (open: boolean) => void; inline?: boolean };
  disabled?: boolean;
};

const fieldMenuEntrance = FadeInUp.duration(180).withInitialValues({ transform: [{ translateY: -10 }] });

function Chevron({ open, color }: { open: boolean; color: string }) {
  return <View aria-hidden><Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></Svg></View>;
}

function OptionIcon({ option }: { option: GlassFilterOption }) {
  const theme = useTheme();
  const Icon = option.icon;
  if (!Icon) return null;
  const color = option.color ?? theme.accent;
  return (
    <View aria-hidden style={[styles.optionIcon, { backgroundColor: `${color}1A` }]}>
      <Icon size={15} color={color} strokeWidth={1.9} />
    </View>
  );
}

function OptionBadge({ badge }: { badge: NonNullable<GlassFilterOption['badge']> }) {
  const theme = useTheme();
  return (
    <View aria-hidden style={[styles.badge, { backgroundColor: theme.glassSelected }]}>
      <Text style={[styles.badgeText, { color: theme.ink }]}>{badge.text}</Text>
    </View>
  );
}

export function GlassFilterMenu({ id, label, value, options, onChange, align = 'right', emptyLabel = 'Todas', field, disabled = false }: GlassFilterMenuProps) {
  const t = useTheme();
  const [filterOpen, setFilterOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const selected = options.find((option) => option.value === value);
  const visible = (field?.open ?? filterOpen) && !disabled;
  const selectedLabel = selected?.label ?? emptyLabel;
  const setOpen = field?.onOpenChange ?? setFilterOpen;
  const toggle = () => setOpen(!visible);
  const choices: readonly GlassFilterOption[] = field ? options : [{ value: '', label: emptyLabel }, ...options];

  const menu = visible && (
    <GlassSurface
      refractive={!field}
      accessibilityRole="menu"
      style={[
        styles.menu,
        field
          ? [styles.fieldMenu, { backgroundColor: t.surface, borderColor: t.line }]
          : [styles.filterMenuPosition, { [align]: 0, borderColor: t.glassEdge }],
      ]}>
      <ScrollView nestedScrollEnabled={field?.inline} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {choices.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              nativeID={`admin-option-${id}-${option.value || 'all'}`}
              accessibilityRole="menuitem"
              accessibilityLabel={option.badge ? option.label + ', ' + option.badge.accessibilityLabel : option.label}
              accessibilityState={{ selected: active }}
              onPress={() => { onChange(option.value); setOpen(false); }}
              style={[styles.menuItem, active && { backgroundColor: field ? `${t.accent}1A` : t.glassSelected }]}>
              {field && <OptionIcon option={option} />}
              <Text style={[styles.optionLabel, { color: active ? t.accent : t.ink, fontWeight: active ? '700' : '600' }]}>{option.label}</Text>
              {option.badge && <OptionBadge badge={option.badge} />}
              {active && <Check aria-hidden size={15} color={t.accent} strokeWidth={2.3} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </GlassSurface>
  );

  return (
    <View style={{ position: 'relative', zIndex: visible ? 3 : 1 }}>
      {field ? (
        <Pressable
          nativeID={`admin-select-${id}`}
          accessibilityRole="button"
          accessibilityLabel={[label, selectedLabel, selected?.badge?.accessibilityLabel].filter(Boolean).join(', ')}
          accessibilityState={{ expanded: visible, disabled }}
          disabled={disabled}
          onPress={toggle}
          style={({ pressed }) => [styles.field, { backgroundColor: visible || pressed ? t.glassSelected : t.backgroundElement, borderColor: visible ? t.accent : t.line, opacity: disabled ? 0.6 : 1 }]}>
          {selected && <OptionIcon option={selected} />}
          <Text style={[styles.optionLabel, { color: t.ink, fontWeight: '700' }]}>{selectedLabel}</Text>
          {selected?.badge && <OptionBadge badge={selected.badge} />}
          <Chevron open={visible} color={t.muted} />
        </Pressable>
      ) : (
        <GlassChip nativeID={`admin-select-${id}`} refractive clear label={`${label}: ${selectedLabel}`} selected={!!selected} accessibilityRole="button" onPress={toggle}>
          <Chevron open={visible} color={selected ? t.accentContrast : t.muted} />
        </GlassChip>
      )}
      {visible && field?.inline && menu}
      {visible && !field?.inline && (
        <>
          <Pressable accessibilityLabel={`Cerrar ${label}`} onPress={() => setOpen(false)} style={styles.dismiss} />
          {field ? (
            <Animated.View entering={reduceMotion ? undefined : fieldMenuEntrance} style={styles.fieldMenuPosition}>
              {menu}
            </Animated.View>
          ) : menu}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dismiss: { position: 'absolute', top: -3000, left: -3000, width: 6000, height: 6000, cursor: 'auto' },
  menu: { maxHeight: 336, padding: 6, borderRadius: 18, borderWidth: 1, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 56, 58, 0.16)' },
  filterMenuPosition: { position: 'absolute', top: 46, minWidth: 220 },
  fieldMenuPosition: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 5 },
  fieldMenu: { borderRadius: 13 },
  menuItem: { minHeight: 38, paddingHorizontal: 9, borderRadius: 11, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { minHeight: 46, paddingHorizontal: 10, borderRadius: 11, borderCurve: 'continuous', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionIcon: { width: 26, height: 26, flexShrink: 0, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  badgeText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  optionLabel: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 17 },
});

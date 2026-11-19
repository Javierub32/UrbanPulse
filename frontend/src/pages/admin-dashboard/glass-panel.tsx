import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

export type GlassPanelProps = PropsWithChildren<ViewProps & { radius?: number; tone?: 'light' | 'dark' }>;

/** Alternativa sin cristal para plataformas que no son web: una superficie translúcida. */
export function GlassPanel({ radius = 24, tone = 'light', style, children, ...props }: GlassPanelProps) {
  const background = tone === 'dark' ? 'rgba(12, 38, 44, 0.82)' : 'rgba(236, 246, 242, 0.82)';
  return (
    <View {...props} style={[{ borderRadius: radius, borderCurve: 'continuous', backgroundColor: background }, style]}>
      {children}
    </View>
  );
}

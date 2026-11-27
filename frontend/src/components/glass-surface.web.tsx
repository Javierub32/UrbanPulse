import { LiquiGlass } from '@liqui-design/glass';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type GlassSurfaceProps = ViewProps & { refractive?: boolean };

export function GlassSurface({ style, children, refractive = false, ...props }: GlassSurfaceProps) {
  const theme = useTheme();
  const radius = StyleSheet.flatten(style)?.borderRadius;
  return <View {...props} className="citizen-glass" style={[{ backgroundColor: theme.glass }, style]}>
    {refractive && <LiquiGlass className="citizen-liquid" radius={typeof radius === 'number' ? radius : 24} blur={3} refraction={80} bezel={20} frost={0.35} saturation={1.3} aria-hidden="true" />}
    {children}
  </View>;
}

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type GlassSurfaceProps = ViewProps & { refractive?: boolean };

export function GlassSurface({ style, children, refractive: _refractive, ...props }: GlassSurfaceProps) {
  const theme = useTheme();
  if (isLiquidGlassAvailable()) return <GlassView {...props} glassEffectStyle="regular" style={style}>{children}</GlassView>;
  return <View {...props} style={[{ backgroundColor: theme.surface }, style]}>{children}</View>;
}

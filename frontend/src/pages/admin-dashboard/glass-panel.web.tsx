import { LiquiGlass } from '@liqui-design/glass';
import { View } from 'react-native';

import type { GlassPanelProps } from './glass-panel';

/**
 * Superficie de cristal líquido (liqui). Refracta lo que haya detrás —aquí el mapa—, así que
 * conviene usarla en pocas superficies grandes: el lateral y el panel de la gráfica.
 */
export function GlassPanel({ radius = 24, tone = 'light', style, children, ...props }: GlassPanelProps) {
  return (
    <View {...props} style={[{ position: 'relative', borderRadius: radius }, style]}>
      <LiquiGlass
        className={`admin-glass admin-glass--${tone}`}
        radius={radius}
        blur={tone === 'dark' ? 2 : 3}
        refraction={tone === 'dark' ? 70 : 90}
        bezel={tone === 'dark' ? 22 : 26}
        frost={tone === 'dark' ? 0.5 : 0.35}
        saturation={1.3}
        aria-hidden="true"
      />
      {children}
    </View>
  );
}

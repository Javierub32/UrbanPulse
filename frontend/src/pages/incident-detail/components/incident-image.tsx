import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Acepta una URL cuando el contrato de incidencias incluya imágenes. */
export function IncidentImage({ uri }: { uri?: string | null }) {
  return <IncidentImageContent key={uri ?? ''} uri={uri} />;
}

function IncidentImageContent({ uri }: { uri?: string | null }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const hasImage = !!uri?.trim() && !failed;

  return <View style={{ width: '100%', height: 200, borderRadius: 20, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.backgroundElement }}>
    {hasImage ? <Image source={{ uri: uri! }} contentFit="cover" accessibilityLabel="Imagen de la incidencia" onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} /> :
      <View accessibilityLabel="Sin imagen" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
        <View style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSelected }}>
          <Svg width={30} height={30} viewBox="0 0 32 32" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Rect x={4} y={6} width={24} height={20} rx={4} stroke={theme.accent} strokeWidth={1.8} />
            <Circle cx={21} cy={12} r={2} fill={theme.accent} />
            <Path d="M6 23l6.5-7 4.5 4 3-2.5 6 5.5" stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <ThemedText type="smallBold">Sin imagen</ThemedText>
      </View>}
  </View>;
}

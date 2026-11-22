import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

export function MapTopFade({ height, children }: PropsWithChildren<{ height: number; progressive?: boolean }>) {
  return <View pointerEvents="none" aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
    {children}
  </View>;
}

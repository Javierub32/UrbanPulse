import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';

const SLIDE_GAP = 12;

export function AttachmentCarousel({ children }: { children: (size: { width: number; height: number }) => ReactNode }) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const width = Math.min(280, Math.round(viewportWidth * 0.88));

  return (
    <View onLayout={({ nativeEvent }) => setViewportWidth(nativeEvent.layout.width)}>
      {width > 0 && <ScrollView horizontal nestedScrollEnabled directionalLockEnabled removeClippedSubviews={false}
        accessibilityLabel="Carrusel de fotos y vídeos" showsHorizontalScrollIndicator={Platform.OS === 'web'}
        decelerationRate="fast" snapToInterval={width + SLIDE_GAP}
        contentContainerStyle={{ gap: SLIDE_GAP }}>
        {children({ width, height: Math.round(width * 0.7) })}
      </ScrollView>}
    </View>
  );
}

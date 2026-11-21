import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketOverlay, useTicketDetail } from './components/ticket-stack';
import { TicketGrid } from './components/ticket-grid';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(true);
  const detail = useTicketDetail(id);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const top = insets.top + 64;
  const width = Math.min(520, size.width - 40);
  return <View
    style={{ flex: 1 }}
    onLayout={({ nativeEvent: { layout: { width, height } } }) => setSize(current =>
      current.width === width && current.height === height ? current : { width, height }
    )}
  >
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: router.canGoBack() ? progress : 1 }]}>
      <TicketGrid />
    </Animated.View>
    {width > 0 && size.height > 0 && <TicketOverlay
      selection={{ incident: { id, title: 'Detalle del aviso', status: null }, frame: { x: (size.width - width) / 2, y: size.height + 16, width }, last: true }}
      detail={detail}
      progress={progress}
      rootHeight={size.height}
      top={top}
      reduceMotion={reduceMotion}
      backLabel="Cerrar aviso"
      backdropColor="transparent"
      onClosed={close}
    />}
  </View>;
}

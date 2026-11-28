import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { IncidentListItem } from '@/types/incidents';
import ReportScreen from './index';

type Props = { visible: boolean; onClose: () => void; onSubmitted: (incident: IncidentListItem) => void };
export function ReportSheet({ visible, onClose, onSubmitted }: Props) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(visible);
  const [busy, setBusy] = useState(false);
  const [paperOverlaysSheet, setPaperOverlaysSheet] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const sheetOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!visible) return;
    // The form remains mounted until the closing animation finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, progress, reduceMotion]);
  const dismiss = useCallback((incident?: IncidentListItem) => {
    if (busy && !incident) return;
    if (incident && Platform.OS === 'android') {
      progress.setValue(0);
      setMounted(false);
      setPaperOverlaysSheet(false);
      onSubmitted(incident);
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : incident ? 600 : 220, easing: incident ? Easing.in(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      setPaperOverlaysSheet(false);
      if (incident) onSubmitted(incident); else onClose();
    });
  }, [busy, onClose, onSubmitted, progress, reduceMotion]);
  if (!mounted && !visible) return null;
  return <Modal transparent visible={mounted || visible} animationType="none" onRequestClose={() => dismiss()}>
    <View style={styles.overlay}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8, 28, 30, 0.32)', opacity: progress }]} />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.canvas, overflow: paperOverlaysSheet ? 'visible' : 'hidden', height: Math.max(0, height * 0.94), transform: [{ translateY: sheetOffset }] }]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <ReportScreen onClose={() => dismiss()} onSubmitted={dismiss} onBusyChange={setBusy} onPaperOverlayChange={setPaperOverlaysSheet} sheetOffset={sheetOffset} />
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 600, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', boxShadow: '0 -10px 32px rgba(8, 28, 30, 0.22)' }, grabber: { width: 38, height: 4, borderRadius: 4, alignSelf: 'center', marginTop: 9 } });

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

export function useTicketAnimation() {
  const [active, setActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [button] = useState(() => new Animated.Value(1));
  const [tear] = useState(() => new Animated.Value(0));
  const [fall] = useState(() => new Animated.Value(0));
  const [ticket] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [closeCue] = useState(() => new Animated.Value(0));
  const closeCallback = useRef<(() => void) | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { subscription.remove(); animation.current?.stop(); };
  }, []);
  useEffect(() => {
    const id = closeCue.addListener(({ value }) => { if (value >= 1) closeCallback.current?.(); });
    return () => closeCue.removeListener(id);
  }, [closeCue]);

  function start(onComplete: () => void, onDeparture?: () => void) {
    setActive(true);
    closeCallback.current = onDeparture ?? null;
    const hideButton = Animated.timing(button, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.current = reduceMotion
      ? Animated.sequence([hideButton, Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true })])
      : Animated.sequence([
          hideButton,
          Animated.timing(tear, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(fall, { toValue: 1, duration: 560, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(180),
              Animated.timing(ticket, { toValue: 0.04, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(ticket, { toValue: 1, duration: 620, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.delay(720),
              Animated.timing(closeCue, { toValue: 1, duration: 1, useNativeDriver: false }),
            ]),
          ]),
          Animated.delay(90),
        ]);
    animation.current.start(({ finished }) => { if (finished) onComplete(); });
  }

  return { active, button, tear, fall, ticket, fade, reduceMotion, start };
}

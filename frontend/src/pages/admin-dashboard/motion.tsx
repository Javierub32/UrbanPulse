import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

type RevealProps = PropsWithChildren<{ index?: number; distance?: number; scale?: boolean; style?: StyleProp<ViewStyle> }>;

/**
 * Entrada escalonada: el bloque aparece (opacidad + desplazamiento) cada vez que su pantalla
 * recibe el foco, de modo que cambiar de pestaña siempre se siente como una transición.
 */
export function Reveal({ index = 0, distance = 18, scale = true, style, children }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        progress.set(1);
        return;
      }
      progress.set(0);
      progress.set(withDelay(index * 70, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })));
      return () => progress.set(0);
    }, [index, reduceMotion, progress]),
  );

  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * distance }, { scale: scale ? 0.985 + 0.015 * progress.get() : 1 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Valor 0→1 con salida suave que se reinicia al recibir el foco (o al cambiar `restartKey`).
 * Sirve para contadores y para el trazo de la gráfica.
 */
export function useFocusProgress(duration = 900, delay = 0, restartKey: unknown = 0) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        setProgress(1);
        return;
      }
      void restartKey; // cambiar la clave reinicia la animación aunque la pantalla conserve el foco
      let frame = 0;
      let start = 0;
      setProgress(0);
      const tick = (now: number) => {
        if (!start) start = now + delay;
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        setProgress(1 - Math.pow(1 - t, 3));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    },[duration, delay, reduceMotion, restartKey]),
  );

  return progress;
}

/** Punto con un anillo que se expande: marca algo que pide atención sin usar texto extra. */
export function Ping({ color, size = 8 }: { color: string; size?: number }) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    phase.set(withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(phase);
  }, [reduceMotion, phase]);

  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - phase.get()), transform: [{ scale: 1 + phase.get() * 2.4 }] }));
  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Animated.View style={[dot, { position: 'absolute', top: 0, left: 0 }, ring]} />
      <View style={dot} />
    </View>
  );
}

/** Marcador de carga que respira, para que la espera tenga la forma del contenido. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    phase.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(phase);
  }, [reduceMotion, phase]);

  const pulse = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * phase.get() }));
  return <Animated.View style={[{ backgroundColor: 'rgba(120, 150, 148, 0.22)', borderRadius: 14 }, style, pulse]} />;
}

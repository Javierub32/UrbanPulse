import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, findNodeHandle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IncidentTicketContent, TICKET_STACK_BORDER_WIDTH, TICKET_TITLE_AREA_HEIGHT, TicketHeader } from '@/components/incident-ticket';
import { useTheme } from '@/hooks/use-theme';
import { getIncidentDetail } from '@/pages/incident-detail/services/incident-detail-service';
import { TicketBackground, TICKET_EDGE_HEIGHT } from '@/pages/report/components/ticket-paper';
import { ApiError } from '@/services/api-client';
import type { IncidentDetail, IncidentListItem } from '@/types/incidents';

type TicketSummary = Pick<IncidentListItem, 'id' | 'title' | 'status'>;
export type SelectedTicket = { incident: TicketSummary; frame: { x: number; y: number; width: number }; last: boolean };
export type TicketArrival = { id: string; progress: Animated.Value; fromBottom?: number };
export const TICKET_STACK_STEP = TICKET_TITLE_AREA_HEIGHT;
const STACK_PAPER_HEIGHT = TICKET_STACK_STEP + 32;
const TICKET_OVERSHOOT = -3;
const TICKET_RISE_DURATION = 250;
const TICKET_SETTLE_DURATION = 100;

type StackItemProps = {
  incident: IncidentListItem;
  selected?: boolean;
  detail?: ReturnType<typeof useTicketDetail>;
  progress?: Animated.Value;
  travel?: number;
  arrival?: TicketArrival;
  reduceMotion: boolean;
  onArrivalFinished?: (id: string) => void;
  onSelect?: (selection: SelectedTicket, restoreFocus: () => void) => void;
  href?: Href;
  nativeID?: string;
};

export function TicketStackItem({ incident, selected, detail, progress, travel = 0, arrival, reduceMotion, onArrivalFinished, onSelect, href, nativeID }: StackItemProps) {
  const last = !!detail;
  const theme = useTheme();
  const ref = useRef<View>(null);
  const slide = progress?.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });
  const entering = arrival?.id === incident.id ? arrival.progress : undefined;
  const fromBottom = arrival?.fromBottom;
  const makingRoom = !entering && !reduceMotion ? arrival?.progress : undefined;
  const arrivalOffset = entering && !reduceMotion
    ? entering.interpolate({ inputRange: [0, 1, 2], outputRange: [fromBottom ?? 32, TICKET_OVERSHOOT, 0] })
    : makingRoom?.interpolate({ inputRange: [0, 1, 2], outputRange: [-TICKET_STACK_STEP, TICKET_OVERSHOOT, 0] });
  const arrivalOpacity = last && entering && !reduceMotion && fromBottom === undefined
    ? entering.interpolate({ inputRange: [0, 0.45], outputRange: [0, 1], extrapolate: 'clamp' })
    : 1;

  useLayoutEffect(() => {
    if (!entering) return;
    // Let the row mount before starting, including when FlatList has to scroll to it.
    const rise = fromBottom === undefined ? TICKET_RISE_DURATION : 240;
    const riseEasing = fromBottom === undefined ? Easing.cubic : Easing.quad;
    const animation = Animated.sequence([
      Animated.timing(entering, { toValue: 1, duration: reduceMotion ? 0 : rise, easing: Easing.out(riseEasing), useNativeDriver: true, isInteraction: false }),
      Animated.timing(entering, { toValue: 2, duration: reduceMotion ? 0 : TICKET_SETTLE_DURATION, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]);
    const frame = requestAnimationFrame(() => animation.start(({ finished }) => { if (finished) onArrivalFinished?.(incident.id); }));
    return () => { cancelAnimationFrame(frame); animation.stop(); };
  }, [entering, incident.id, reduceMotion, onArrivalFinished, fromBottom]);

  const restoreFocus = () => {
    if (Platform.OS === 'web') (ref.current as unknown as { focus?: (options?: { preventScroll?: boolean }) => void } | null)?.focus?.({ preventScroll: true });
    else {
      const node = findNodeHandle(ref.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    }
  };
  // Link's slot merges style objects, so its direct child must use a flattened style.
  const paperStyle = StyleSheet.flatten([
    last ? styles.lastPaper : styles.stackPaper,
    { backgroundColor: last ? 'transparent' : theme.ticketPaper },
  ]);
  const ticket = (
    <Pressable
      ref={ref}
      nativeID={nativeID}
      collapsable={false}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={`Abrir aviso: ${incident.title?.trim() || 'Sin título'}`}
      onPress={onSelect ? () => ref.current?.measureInWindow((x, y, width) => onSelect({ incident, frame: { x, y, width }, last }, restoreFocus)) : undefined}
      style={href ? paperStyle : ({ pressed }) => [paperStyle, { opacity: pressed ? 0.85 : 1 }]}>
      {detail ? <TicketDetail incident={incident} detail={detail} allowRetry={false} /> : <><TicketHeader compact title={incident.title} status={incident.status} /><View style={styles.stackTail} /></>}
    </Pressable>
  );
  const translateY = slide && arrivalOffset ? Animated.add(slide, arrivalOffset) : arrivalOffset ?? slide ?? 0;
  return <Animated.View style={[!last && styles.stackItem, { zIndex: last ? 1 : 0, opacity: selected ? 0 : arrivalOpacity, transform: [{ translateY }] }]}>
    {href ? <Link href={href} asChild>{ticket}</Link> : ticket}
  </Animated.View>;
}

type DetailState = { status: 'loading' } | { status: 'error'; message: string; retry: boolean } | { status: 'success'; data: IncidentDetail };

export function useTicketDetail(id?: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ id: string; attempt: number; state: DetailState } | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    getIncidentDetail(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ id, attempt, state: { status: 'success', data } });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const code = error instanceof ApiError ? error.status : 0;
      const message = code === 404 ? 'No se ha encontrado la incidencia.' : code === 403 ? 'No tienes permiso para consultar esta incidencia.' : code === 400 ? 'Identificador de incidencia no válido.' : error instanceof Error ? error.message : 'No se ha podido cargar la incidencia.';
      setResult({ id, attempt, state: { status: 'error', message, retry: ![400, 403, 404].includes(code) } });
    });
    return () => controller.abort();
  }, [id, attempt]);

  const state: DetailState = result && result.id === id && result.attempt === attempt ? result.state : { status: 'loading' };
  return { state, retry: () => setAttempt(value => value + 1) };
}

export function TicketDetail({ incident, detail, allowRetry = true, footerSpace = 0 }: { incident: TicketSummary; detail: ReturnType<typeof useTicketDetail>; allowRetry?: boolean; footerSpace?: number }) {
  const theme = useTheme();
  const { state, retry } = detail;
  const [paperSize, setPaperSize] = useState({ width: 0, height: 0 });

  return <View style={paperSize.width === 0 ? { backgroundColor: theme.ticketPaper } : undefined} onLayout={event => { const { width, height } = event.nativeEvent.layout; setPaperSize(current => current.width === width && current.height === height ? current : { width, height }); }}>
    {paperSize.width > 0 && <TicketBackground width={paperSize.width} height={paperSize.height} color={theme.ticketPaper} ink={theme.ticketInk} />}
    <View pointerEvents="none" style={[styles.paperTopShadow, { backgroundColor: theme.ticketPaper }]} />
    {state.status === 'success' ? <IncidentTicketContent incident={state.data} /> : <>
      <TicketHeader title={incident.title} status={incident.status} />
      {state.status === 'loading' ? <View style={styles.detailState}><ActivityIndicator color={theme.ticketMuted} /><Text style={[styles.stateText, { color: theme.ticketMuted }]}>Cargando incidencia…</Text></View> : <View style={styles.detailState}><Text accessibilityRole="alert" style={[styles.stateText, { color: theme.ticketInk }]}>{state.message}</Text>{state.retry && (allowRetry ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={[styles.retryText, { color: theme.ticketInk }]}>Reintentar</Text></Pressable> : <Text style={[styles.stateText, { color: theme.ticketMuted }]}>Abre el aviso para reintentar.</Text>)}</View>}
    </>}
    <View style={{ height: footerSpace + TICKET_EDGE_HEIGHT }} />
  </View>;
}

type OverlayProps = {
  selection: SelectedTicket;
  detail: ReturnType<typeof useTicketDetail>;
  progress: Animated.Value;
  rootHeight: number;
  top: number;
  reduceMotion: boolean;
  backLabel?: string;
  backdropColor?: string;
  onClosed: () => void;
};

export function TicketOverlay({ selection, detail, progress, rootHeight, top, reduceMotion, backLabel = 'Volver a los avisos', backdropColor = 'rgba(128, 128, 128, 0.04)', onClosed }: OverlayProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const backRef = useRef<View>(null);
  const scrollOffset = useRef(0);
  const [scrollReturn] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const closeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const [opened, setOpened] = useState(false);
  const { frame } = selection;
  const nextTop = frame.y + TICKET_STACK_STEP;
  // The moving clip follows the next ticket. Its inverse keeps the paper's path independent of that edge.
  const overlapOffset = !selection.last && nextTop < rootHeight
    ? progress.interpolate({ inputRange: [0, (rootHeight - nextTop) / rootHeight], outputRange: [nextTop - rootHeight, 0], extrapolate: 'clamp' })
    : undefined;
  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [0, top - frame.y] });
  const translateY = overlapOffset ? Animated.subtract(slide, overlapOffset) : slide;
  const backdrop = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0, 1] });
  const backOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1] });

  useEffect(() => {
    if (closing.current) return;
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 350, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const start = requestAnimationFrame(() => {
      if (!closing.current) animation.start(({ finished }) => { if (finished) setOpened(true); });
    });
    return () => { cancelAnimationFrame(start); animation.stop(); };
  }, [progress, reduceMotion]);

  useEffect(() => () => closeAnimation.current?.stop(), []);

  useEffect(() => {
    if (!opened) return;
    if (Platform.OS === 'web') {
      (backRef.current as unknown as { focus?: () => void } | null)?.focus?.();
    } else {
      const node = findNodeHandle(backRef.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [opened]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpened(false);
    const offset = scrollOffset.current;
    if (offset > 0) scrollRef.current?.scrollTo({ y: offset, animated: false });
    const config = { duration: reduceMotion ? 0 : 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true };
    closeAnimation.current = Animated.parallel([
      Animated.timing(progress, { ...config, toValue: 0 }),
      Animated.timing(scrollReturn, { ...config, toValue: offset }),
    ]);
    closeAnimation.current.start(({ finished }) => { if (finished) onClosed(); });
  }, [onClosed, progress, reduceMotion, scrollReturn]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    if (Platform.OS !== 'web') return () => subscription.remove();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { subscription.remove(); window.removeEventListener('keydown', onKeyDown); };
  }, [close]);

  return <View role="dialog" accessibilityLabel="Detalle del aviso" aria-modal accessibilityViewIsModal style={StyleSheet.absoluteFill} pointerEvents="box-none">
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdrop }]} />
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlapClip]}>
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlapClip, overlapOffset && { transform: [{ translateY: overlapOffset }] }]}>
        <Animated.View style={{ position: 'absolute', left: frame.x - 20, top: frame.y - 16, width: frame.width + 40, height: Math.max(1, rootHeight - top) + 16, transform: [{ translateY }] }}>
          <ScrollView ref={scrollRef} scrollEnabled={opened} showsVerticalScrollIndicator={false} contentContainerStyle={styles.ticketScroll} onScroll={event => { scrollOffset.current = Math.max(0, event.nativeEvent.contentOffset.y); }} scrollEventThrottle={16}>
            <Animated.View style={{ transform: [{ translateY: scrollReturn }] }}>
              <TicketDetail key={selection.incident.id} incident={selection.incident} detail={detail} />
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
    <Animated.View style={[styles.backPosition, { top: Math.max(8, top - 54), left: frame.x, opacity: backOpacity }]} pointerEvents={opened ? 'auto' : 'none'}>
      <Pressable ref={backRef} accessibilityRole="button" accessibilityLabel={backLabel} disabled={!opened} onPress={close} style={({ pressed }) => [styles.backButton, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}>
        <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={20} tintColor={theme.ink} />
      </Pressable>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  stackItem: { marginBottom: TICKET_STACK_STEP - STACK_PAPER_HEIGHT }, stackPaper: { height: STACK_PAPER_HEIGHT, borderWidth: TICKET_STACK_BORDER_WIDTH, borderColor: 'rgba(0, 0, 0, 0.18)', boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.14), 0 6px 18px rgba(0, 0, 0, 0.12)' }, lastPaper: { overflow: 'visible', boxShadow: '0 -5px 8px -4px rgba(0, 0, 0, 0.3)' }, paperTopShadow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 1, boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.14), 0 6px 18px rgba(0, 0, 0, 0.12)' }, stackTail: { height: 30 },
  overlapClip: { overflow: 'hidden' }, ticketScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 }, backPosition: { position: 'absolute' }, backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.16)' },
  detailState: { minHeight: 150, padding: 20, alignItems: 'flex-start', justifyContent: 'center', gap: 12 }, stateText: { fontSize: 14, lineHeight: 21 }, retry: { minHeight: 44, justifyContent: 'center' }, retryText: { fontSize: 14, fontWeight: '700' },
});

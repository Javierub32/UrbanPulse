import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { TICKET_STACK_STEP, TicketStackItem, useTicketDetail } from '@/pages/incidents/components/ticket-stack';
import type { IncidentListItem } from '@/types/incidents';

import { Skeleton } from './motion';
import { useAdminTheme } from './theme';

const STACK_SIZE = 12;

type ReviewTicketProps = {
  incident: IncidentListItem;
  index: number;
  current: number | null;
  last: boolean;
  reduceMotion: boolean;
  onSettled: (id: string) => void;
};

function ReviewTicket(props: ReviewTicketProps) {
  const { incident, current, last, reduceMotion } = props;
  const detail = useTicketDetail(!reduceMotion || last ? incident.id : undefined);
  if (current === null) return null;

  return <ReviewTicketPaper {...props} current={current} detail={detail} />;
}

type ReviewTicketPaperProps = ReviewTicketProps & {
  current: number;
  detail: ReturnType<typeof useTicketDetail>;
};

function ReviewTicketPaper({ incident, index, current, last, reduceMotion, onSettled, detail }: ReviewTicketPaperProps) {
  const { height } = useWindowDimensions();
  const slot = useRef<View>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [fromBottom, setFromBottom] = useState<number | null>(null);
  const entering = !reduceMotion && index === current;
  const covered = !last && (reduceMotion || index < current - 1);
  const ready = detail.state.status !== 'loading';

  useLayoutEffect(() => {
    if (!entering || !ready || fromBottom !== null) return;

    let active = true;
    const frame = requestAnimationFrame(() => {
      slot.current?.measureInWindow((_x, y) => {
        if (active) setFromBottom(Math.max(0, height - y));
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [entering, ready, fromBottom, height]);

  const visible = reduceMotion || index < current || (entering && fromBottom !== null);
  const arrival = entering && fromBottom !== null ? { id: incident.id, progress, fromBottom } : undefined;

  return (
    <View ref={slot} collapsable={false} style={[!last && styles.slot, { zIndex: index }]}>
      {visible && (
        <View style={!last && styles.paper}>
          <TicketStackItem
            incident={incident}
            detail={covered ? undefined : detail}
            arrival={arrival}
            reduceMotion={reduceMotion}
            onArrivalFinished={onSettled}
            href={`/operator/incident/${incident.id}`}
            nativeID={`admin-review-incident-${incident.id}`}
          />
        </View>
      )}
    </View>
  );
}

function ReviewTicketDeal({ tickets }: { tickets: IncidentListItem[] }) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    setCurrent(0);
    return () => setCurrent(null);
  }, []));

  const advance = useCallback((id: string) => {
    setCurrent((index) => index !== null && tickets[index]?.id === id ? index + 1 : index);
  }, [tickets]);

  return (
    <View>
      {tickets.map((incident, index) => (
        <ReviewTicket
          key={incident.id}
          incident={incident}
          index={index}
          current={current}
          last={index === tickets.length - 1}
          reduceMotion={reduceMotion}
          onSettled={advance}
        />
      ))}
    </View>
  );
}

export function PendingReviewStack({ incidents, loading, error }: { incidents: IncidentListItem[]; loading: boolean; error: boolean }) {
  const theme = useAdminTheme();
  const tickets = useMemo(
    () => incidents.filter(({ status }) => status === 'REPORTED').slice(0, STACK_SIZE).reverse(),
    [incidents],
  );

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Pendientes de revisión</Text>
      {loading && <Skeleton style={styles.skeleton} />}
      {error && <Text style={{ color: theme.muted }}>La pila estará disponible al recuperar el listado.</Text>}
      {!loading && !error && tickets.length === 0 && (
        <Text style={{ color: theme.muted }}>No hay incidencias pendientes de revisión.</Text>
      )}
      {!!tickets.length && <ReviewTicketDeal key={tickets.map(({ id }) => id).join(',')} tickets={tickets} />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: -0.35 },
  skeleton: { height: 196, borderRadius: 10 },
  // Each settled ticket keeps one header-height slot. Its body can extend behind the next ticket.
  slot: { height: TICKET_STACK_STEP, position: 'relative' },
  paper: { position: 'absolute', top: 0, left: 0, right: 0 },
});

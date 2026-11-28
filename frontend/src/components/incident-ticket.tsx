import { Image, type ImageSource } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { reviewHistoryLabel } from '@/pages/incident-detail/review-history';
import { parseDate, statusLabel, ticketStatusTone } from '@/pages/incidents/incident-filters';
import LocationMap from '@/pages/report/components/location-map';
import { categories } from '@/pages/report/services/report-service';
import type { IncidentDetail } from '@/types/incidents';

export const TICKET_STACK_BORDER_WIDTH = 1;
const TITLE_DIVIDER_WIDTH = 2;
const TITLE_MAX_LINES = 2;
const TITLE_LINE_HEIGHT = 22;
const TITLE_VERTICAL_PADDING = 4;
export const TICKET_TITLE_AREA_HEIGHT = TITLE_MAX_LINES * TITLE_LINE_HEIGHT + 2 * TITLE_VERTICAL_PADDING;
const TITLE_HEADER_HEIGHT = TICKET_TITLE_AREA_HEIGHT + TITLE_DIVIDER_WIDTH;
const COMPACT_HEADER_HEIGHT = TITLE_HEADER_HEIGHT - TICKET_STACK_BORDER_WIDTH;
const PLACEHOLDER_BACKGROUND = '#EAEAEA';

type TicketIncident = Pick<IncidentDetail, 'title' | 'description' | 'category' | 'status' | 'registeredAt' | 'latitude' | 'longitude' | 'normalizedAddress'> & {
  priority?: string | null;
  history?: IncidentDetail['history'];
  atmosphericData?: IncidentDetail['atmosphericData'];
  imageUri?: string | null;
};

const priorities: Record<string, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' };
const atmosphericLabels: Record<string, string> = {
  temperature: 'Temperatura', temperature_2m: 'Temperatura', precipitation: 'Precipitación',
  pm2_5: 'PM2.5', pm10: 'PM10', nitrogen_dioxide: 'Dióxido de nitrógeno',
};

function statusColor(status: string | null) {
  const tone = ticketStatusTone(status);
  return tone === 'reported' ? '#F45E68' : tone === 'progress' ? '#FFD43B' : tone === 'resolved' ? '#52D48A' : tone === 'rejected' ? '#F45E68' : '#82918D';
}

export function TicketHeader({ title, status, draft = false, compact = false }: { title: string | null; status: string | null; draft?: boolean; compact?: boolean }) {
  const theme = useTheme();
  const color = statusColor(status);
  const label = draft ? 'Pendiente de envío' : status === 'REPORTED' ? 'Notificada' : statusLabel(status);
  return <View style={[styles.heading, compact && styles.compactHeading, { borderColor: '#858585' }]}>
    <Text accessibilityRole="header" numberOfLines={TITLE_MAX_LINES} style={[styles.title, { color: theme.ticketInk }]}>{title?.trim() || 'Aviso sin título'}</Text>
    <View accessible accessibilityLabel={`Estado: ${label}`} style={[styles.statusDot, { backgroundColor: color }]} />
  </View>;
}

export function TicketPhoto({ uri, source, compact = false, style }: { uri?: string | null; source?: ImageSource; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  return <View style={[compact ? styles.thumbnail : styles.photo, compact && { backgroundColor: theme.backgroundElement }, Platform.OS === 'web' && styles.monochromePhoto, style]}>
    {(source || uri) && !failed ? <Image source={source ?? { uri: uri ?? undefined }} cachePolicy={source ? 'none' : undefined} contentFit="cover" accessibilityLabel="Imagen de la incidencia" onError={() => setFailed(true)} style={StyleSheet.absoluteFill} /> :
      <View accessibilityLabel="Sin imagen" style={[styles.photoPlaceholder, compact && styles.thumbnailPlaceholder]}>
        <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={compact ? 20 : 28} tintColor={compact ? theme.muted : theme.ticketMuted} />
        {!compact && <Text style={[styles.placeholderText, { color: theme.ticketMuted }]}>Sin imagen</Text>}
      </View>}
  </View>;
}

function TicketField({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.ticketMuted }]}>{label}</Text><View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.fieldLeader, { borderColor: '#858585' }]} /><Text selectable style={[styles.fieldValue, { color: theme.ticketInk }]}>{value}</Text></View>;
}

export function IncidentTicketContent({ incident, draft = false, cover, onChangeLocation }: { incident: TicketIncident; draft?: boolean; cover?: ImageSource; onChangeLocation?: () => void }) {
  const theme = useTheme();
  const date = parseDate(incident.registeredAt);
  const readings = incident.atmosphericData ?? [];
  const history = incident.history ?? [];
  const coordinate = incident.latitude != null && incident.longitude != null ? { latitude: incident.latitude, longitude: incident.longitude } : null;
  const category = categories.find(item => item.value === incident.category)?.label ?? incident.category ?? 'No disponible';
  const state = draft ? 'Pendiente de envío' : incident.status === 'REPORTED' ? 'Notificada' : statusLabel(incident.status);

  return <View>
    <TicketHeader title={incident.title} status={incident.status} draft={draft} />
    <View style={styles.section}>
      <View style={styles.mediaRow}>
        <TicketPhoto key={cover?.uri ?? incident.imageUri ?? 'no-photo'} uri={incident.imageUri} source={cover} />
        <View style={styles.weather}>
          <SymbolView name={{ ios: 'cloud.sun', android: 'cloud', web: 'cloud' }} size={20} tintColor={theme.ticketMuted} />
          <Text style={[styles.label, { color: theme.ticketMuted }]}>DATOS{ '\n' }ATMOSFÉRICOS</Text>
          {readings.length === 0 ? <Text style={[styles.weatherEmpty, { color: theme.ticketMuted }]}>Sin datos disponibles</Text> : readings.map((reading, index) => <View key={`${reading.key}-${reading.source}-${index}`} style={styles.reading}>
            <Text style={[styles.readingLabel, { color: theme.ticketMuted }]}>{atmosphericLabels[reading.key] ?? reading.key}</Text>
            <Text selectable style={[styles.readingValue, { color: theme.ticketInk }]}>{reading.value}{reading.unit ? ` ${reading.unit}` : ''}</Text>
          </View>)}
        </View>
      </View>
    </View>
    <View style={[styles.section, styles.divider, { borderColor: '#858585' }]}>
      <Text style={[styles.sectionTitle, { color: theme.ticketInk }]}>Descripción</Text>
      <Text selectable style={[styles.body, { color: theme.ticketInk }]}>{incident.description?.trim() || 'Descripción no disponible.'}</Text>
    </View>
    <View style={[styles.section, styles.divider, { borderColor: '#858585' }]}>
      <Text style={[styles.sectionTitle, { color: theme.ticketInk }]}>Detalles</Text>
      <TicketField label="Estado" value={state} />
      <TicketField label="Fecha" value={date ? date.toLocaleDateString('es-ES') : 'No disponible'} />
      <TicketField label="Hora" value={date ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'No disponible'} />
      <TicketField label="Prioridad" value={incident.priority ? priorities[incident.priority] ?? incident.priority : 'No disponible'} />
      <TicketField label="Categoría" value={category} />
    </View>
    <View style={[styles.section, styles.divider, { borderColor: '#858585' }]}>
      <Text style={[styles.sectionTitle, { color: theme.ticketInk }]}>Ubicación</Text>
      <Text selectable style={[styles.body, { color: theme.ticketInk }]}>{incident.normalizedAddress?.trim() || 'Dirección no disponible'}</Text>
      {coordinate ? <>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <LocationMap coordinate={coordinate} height={150} ticket />
        </View>
        <View style={styles.mapFooter}>
          <Text style={[styles.mapCredits, { color: theme.ticketMuted }]}>
            <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://openfreemap.org/')}>OpenFreeMap</Text>
            {' · '}
            <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://openmaptiles.org/')}>© OpenMapTiles</Text>
            {' · '}
            <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}>© OpenStreetMap</Text>
          </Text>
          <Text selectable style={[styles.coordinates, { color: theme.ticketMuted }]}>{coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}</Text>
        </View>
      </> : <View style={styles.mapPlaceholder}><Text style={[styles.placeholderText, { color: theme.ticketMuted }]}>Ubicación no disponible</Text></View>}
      {onChangeLocation && <Pressable accessibilityRole="button" onPress={onChangeLocation} style={styles.changeLocation}><Text style={[styles.link, { color: theme.ticketInk }]}>Cambiar ubicación</Text></Pressable>}
    </View>
    <View style={[styles.section, styles.divider, { borderColor: '#858585' }]}>
      <Text style={[styles.sectionTitle, { color: theme.ticketInk }]}>Historial</Text>
      {history.length === 0 ? <Text style={[styles.bodyMuted, { color: theme.ticketMuted }]}>{draft ? 'Disponible cuando se envíe el aviso.' : 'Todavía no hay cambios de estado registrados.'}</Text> : history.map((entry, index) => {
        const changedAt = parseDate(entry.changedAt);
        return <View key={`${entry.changedAt}-${index}`} style={styles.historyRow}>
          <View style={[styles.historyDot, { backgroundColor: theme.ticketMuted }]} />
          <View style={styles.historyCopy}>
            <Text style={[styles.fieldValue, { color: theme.ticketInk }]}>{reviewHistoryLabel(entry.action) ?? (entry.status === 'REPORTED' ? 'Notificada' : statusLabel(entry.status))}</Text>
            {!!entry.reason && <Text selectable style={[styles.body, { color: theme.ticketInk }]}>{entry.reason}</Text>}
            <Text style={[styles.bodyMuted, { color: theme.ticketMuted }]}>{changedAt ? changedAt.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha no disponible'}</Text>
          </View>
        </View>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  thumbnail: { width: 64, height: 64, borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden' },
  thumbnailPlaceholder: { minHeight: 0 },
  monochromePhoto: { filter: 'grayscale(1)' },
  mapFooter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  mapCredits: { flexShrink: 1, fontSize: 11, lineHeight: 16 },
  coordinates: { flexShrink: 0, fontSize: 11, lineHeight: 16, textAlign: 'right', fontVariant: ['tabular-nums'] },
  heading: {
    minHeight: TITLE_HEADER_HEIGHT,
    paddingHorizontal: 18,
    paddingVertical: TITLE_VERTICAL_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: TITLE_DIVIDER_WIDTH,
    borderStyle: 'dashed',
  },
  compactHeading: {
    height: COMPACT_HEADER_HEIGHT,
    minHeight: COMPACT_HEADER_HEIGHT,
    // The paper border occupies the first pixel of the visible title area.
    paddingTop: TITLE_VERTICAL_PADDING - TICKET_STACK_BORDER_WIDTH,
  },
  title: { flex: 1, fontFamily: Fonts.mono, fontSize: 18, lineHeight: TITLE_LINE_HEIGHT, fontWeight: '700' }, statusDot: { width: 12, height: 12, borderRadius: 6 },
  section: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 }, divider: { borderTopWidth: 2, borderStyle: 'dashed' }, sectionTitle: { fontFamily: Fonts.mono, fontSize: 15, lineHeight: 21, fontWeight: '700' }, label: { fontSize: 10, lineHeight: 14, letterSpacing: 0.5, fontWeight: '700' },
  mediaRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 }, photo: { flex: 3, minHeight: 150, borderRadius: 10, overflow: 'hidden', backgroundColor: PLACEHOLDER_BACKGROUND }, photoPlaceholder: { flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 }, placeholderText: { fontSize: 12, lineHeight: 17, textAlign: 'center' }, weather: { flex: 2, minWidth: 0, gap: 7, paddingVertical: 4 }, weatherEmpty: { fontSize: 12, lineHeight: 17 }, reading: { gap: 1 }, readingLabel: { fontSize: 11, lineHeight: 14 }, readingValue: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 }, bodyMuted: { fontSize: 13, lineHeight: 19 }, field: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, fieldLabel: { fontSize: 13, lineHeight: 19 }, fieldLeader: { flex: 1, minWidth: 12, height: 15, borderBottomWidth: 2, borderStyle: 'dotted' }, fieldValue: { flexShrink: 1, textAlign: 'right', fontSize: 13, lineHeight: 19, fontWeight: '700' }, mapPlaceholder: { height: 100, backgroundColor: PLACEHOLDER_BACKGROUND, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, changeLocation: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, link: { fontSize: 14, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 }, historyCopy: { flex: 1, alignItems: 'flex-start', gap: 2 },
});

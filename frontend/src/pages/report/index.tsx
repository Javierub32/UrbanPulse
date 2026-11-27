import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Armchair, Check, Construction, Ellipsis, Lightbulb, Map, MapPin, Navigation, Sparkles, TrafficCone, Trash2, Trees, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { GlassSurface } from '@/components/glass-surface';
import { IncidentTicketContent } from '@/components/incident-ticket';
import type { IncidentListItem } from '@/types/incidents';
import IncidentDateTimePicker from './components/incident-date-time-picker';
import LocationMap from './components/location-map';
import { PaperSwatch, TicketBackground, TicketStrip, TICKET_EDGE_HEIGHT } from './components/ticket-paper';
import { getTicketCutOffset } from './ticket-cut-scroll';
import { useReportForm } from './hooks/use-report-form';
import { ReportAttachmentPreview } from './components/report-attachment-preview';
import { canUploadAttachments, MAX_ATTACHMENTS } from './services/report-attachments';
import { useReportLocation, type LocationMode } from './hooks/use-report-location';
import { useTicketAnimation } from './hooks/use-ticket-animation';

const steps = [
  { title: '¿Qué ha sucedido?', description: 'Cuéntanos qué ocurre para que podamos ayudarte.' },
  { title: '¿De qué se trata?', description: 'Elige la categoría que mejor encaje con el problema.' },
  { title: '¿Cuándo sucedió?', description: 'Indica la fecha y la hora aproximadas.' },
  { title: '¿Dónde está el problema?', description: 'Una ubicación precisa nos ayudará a encontrarlo.' },
  { title: 'Revisa tu incidencia', description: 'Comprueba los datos antes de enviar tu aviso.' },
] as const;

const categoryDetails: Record<string, { description: string; icon: LucideIcon }> = {
  PUBLIC_ROAD: { description: 'Aceras, calzadas y caminos', icon: Construction },
  STREET_LIGHTING: { description: 'Farolas y alumbrado público', icon: Lightbulb },
  TRAFFIC: { description: 'Semáforos y señalización', icon: TrafficCone },
  GREEN_AREAS: { description: 'Parques, árboles y jardines', icon: Trees },
  CLEANING: { description: 'Suciedad en espacios públicos', icon: Sparkles },
  WASTE: { description: 'Basura y contenedores', icon: Trash2 },
  STREET_FURNITURE: { description: 'Bancos y otros elementos urbanos', icon: Armchair },
  OTHER: { description: 'Otro problema en tu ciudad', icon: Ellipsis },
};
const locationOptions: { value: LocationMode; label: string; detail: string; icon: LucideIcon }[] = [
  { value: 'map', label: 'Seleccionar en el mapa', detail: 'Marca el punto exacto', icon: Map },
  { value: 'current', label: 'Usar mi ubicación actual', detail: 'Utiliza la ubicación de tu dispositivo', icon: Navigation },
  { value: 'assets', label: 'Activos cercanos', detail: 'Busca un elemento de la ciudad', icon: MapPin },
];
const PAPER_SCROLL_EXTENSION = 144;

type ReportScreenProps = { onClose?: () => void; onSubmitted?: (incident: IncidentListItem) => void; onBusyChange?: (busy: boolean) => void; onPaperOverlayChange?: (active: boolean) => void; sheetOffset?: Animated.AnimatedInterpolation<number> };

export default function ReportScreen({ onClose, onSubmitted, onBusyChange, onPaperOverlayChange, sheetOffset }: ReportScreenProps = {}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const form = useReportForm();
  const location = useReportLocation();
  const motion = useTicketAnimation();
  const { height: windowHeight } = useWindowDimensions();
  const stripHeight = windowHeight + 160;
  const submitting = useRef(false);
  const completionHandled = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const pendingScroll = useRef<{ target: number; finish: () => void; cancel: () => void } | null>(null);
  const gestureStart = useRef(0);
  const [scrollOffset] = useState(() => new Animated.Value(0));
  const [viewport, setViewport] = useState({ y: 0, height: 0 });
  const [ticketSlot, setTicketSlot] = useState({ x: 0, y: 0, width: 0 });
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState('');
  const [finishedIncident, setFinishedIncident] = useState<IncidentListItem | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [flightDistance, setFlightDistance] = useState(windowHeight * 2);
  const [ticketSize, setTicketSize] = useState({ width: 0, height: 0 });
  const resolving = location.status === 'loading' || location.streetStatus === 'loading';
  const hasLocation = location.mode !== 'assets' && !!location.coordinate && location.status === 'idle';
  const locked = form.busy || preparing || motion.active;
  const fieldsLocked = locked || !!form.createdIncidentId;
  const primaryDisabled = locked || (step === 3 && resolving) || (step === 4 && (!ticketSize.height || !viewport.height));
  const tearOffset = Animated.multiply(motion.tear, ticketSize.width);
  // The responder reads these refs only in gesture callbacks, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const paperScroll = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !locked && Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { gestureStart.current = scrollPosition.current; },
    onPanResponderMove: (_, gesture) => { scrollRef.current?.scrollTo({ y: Math.max(0, gestureStart.current - gesture.dy), animated: false }); },
  }), [locked]);
  const wheelProps = Platform.OS === 'web' ? { onWheel: (event: { deltaY: number; preventDefault: () => void }) => {
    event.preventDefault();
    if (locked) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, scrollPosition.current + event.deltaY), animated: false });
  } } : {};
  useEffect(() => { onBusyChange?.(fieldsLocked); }, [fieldsLocked, onBusyChange]);
  useEffect(() => () => pendingScroll.current?.cancel(), []);
  useEffect(() => { onPaperOverlayChange?.(motion.active); }, [motion.active, onPaperOverlayChange]);
  useEffect(() => {
    if (!finishedIncident || completionHandled.current) return;
    completionHandled.current = true;
    if (onSubmitted) onSubmitted(finishedIncident);
    else router.replace('/');
  }, [finishedIncident, onSubmitted, router]);
  useLayoutEffect(() => {
    scrollPosition.current = 0;
    scrollOffset.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, scrollOffset]);

  function next() {
    let message = '';
    if (step === 0 && (!form.title.trim() || !form.description.trim())) message = 'Añade un título y una descripción para continuar.';
    if (step === 1 && !form.category) message = 'Selecciona una categoría para continuar.';
    if (step === 3 && !hasLocation) message = 'Selecciona una ubicación para continuar.';
    if (message) { setValidation(message); return; }
    setValidation('');
    setStep(value => Math.min(value + 1, steps.length - 1));
  }

  function syncScroll(offset: number) {
    scrollPosition.current = offset;
    scrollOffset.setValue(offset);
  }

  function revealCut(target: number): Promise<number | null> {
    if (Math.abs(scrollPosition.current - target) < 1) return Promise.resolve(scrollPosition.current);
    if (motion.reduceMotion) {
      scrollRef.current?.scrollTo({ y: target, animated: false });
      syncScroll(target);
      return Promise.resolve(target);
    }
    return new Promise(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        pendingScroll.current = null;
        // End any smooth scroll before switching to the ticket overlay.
        scrollRef.current?.scrollTo({ y: target, animated: false });
        syncScroll(target);
        resolve(target);
      };
      const timeout = setTimeout(finish, 750);
      pendingScroll.current = {
        target, finish,
        cancel: () => { clearTimeout(timeout); pendingScroll.current = null; resolve(null); },
      };
      scrollRef.current?.scrollTo({ y: target, animated: true });
    });
  }

  async function submit() {
    if (submitting.current || !viewport.height || !ticketSize.height) return;
    submitting.current = true;
    setPreparing(true);
    onBusyChange?.(true);
    const cutPosition = ticketSlot.y + ticketSize.height - TICKET_EDGE_HEIGHT;
    const target = getTicketCutOffset(cutPosition, viewport.height, scrollPosition.current);
    const [created, targetScroll] = await Promise.all([
      form.submit(location.coordinate, location.street),
      revealCut(target),
    ]);
    if (targetScroll == null) return;
    setPreparing(false);
    if (!created) {
      submitting.current = false;
      return;
    }
    setFlightDistance(Math.max(windowHeight * 0.5, viewport.y + ticketSlot.y + ticketSize.height - targetScroll + windowHeight * 0.1 + 32));
    // Unmount the paper first; the effect closes the sheet after that render commits.
    motion.start(() => setFinishedIncident(created), () => {
      if (onSubmitted && !completionHandled.current) {
        completionHandled.current = true;
        onSubmitted(created);
      }
    });
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: t.canvas }]}>
    <View style={[styles.shell, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={step === 0 ? 'Cerrar formulario' : 'Volver al paso anterior'} accessibilityState={{ disabled: fieldsLocked }} disabled={fieldsLocked} onPress={() => { setValidation(''); if (step === 0) { if (onClose) onClose(); else router.replace('/'); } else setStep(step - 1); }} style={({ pressed }) => [styles.iconButton, { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.65 : 1 }]}>
          <SymbolView name={{ ios: step === 0 ? 'xmark' : 'arrow.left', android: step === 0 ? 'close' : 'arrow_back', web: step === 0 ? 'close' : 'arrow_back' }} size={19} tintColor={t.ink} />
        </Pressable>
        <Text style={[styles.topLabel, { color: t.ink }]}>Nuevo aviso</Text>
        <Text style={[styles.stepCount, { color: t.muted }]}>{step + 1} / {steps.length}</Text>
      </View>
      <View accessibilityLabel={`Paso ${step + 1} de ${steps.length}`} style={styles.progress}>
        {steps.map((item, index) => <View key={item.title} style={[styles.progressSegment, { backgroundColor: index <= step ? t.accentSurface : t.line }]} />)}
      </View>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEnabled={!motion.active} onLayout={event => { const { y, height } = event.nativeEvent.layout; setViewport(current => current.y === y && current.height === height ? current : { y, height }); }} onScroll={event => {
          if (motion.active) return;
          const offset = event.nativeEvent.contentOffset.y;
          syncScroll(offset);
          const pending = pendingScroll.current;
          if (pending && Math.abs(offset - pending.target) < 1) pending.finish();
        }} scrollEventThrottle={16} contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={[styles.heading, { color: t.ink }]}>{steps[step].title}</Text>
          <Text style={[styles.description, { color: t.muted }]}>{steps[step].description}</Text>
        </View>
        {step === 0 && <View style={styles.formGroup}>
          <View style={styles.field}><Text style={[styles.label, { color: t.ink }]}>Título</Text><TextInput accessibilityLabel="Título de la incidencia" placeholder="Por ejemplo, farola apagada" placeholderTextColor={t.muted} maxLength={255} value={form.title} onChangeText={form.setTitle} style={[styles.input, { color: t.ink, backgroundColor: t.surface, borderColor: t.line }]} /></View>
          <View style={styles.field}><Text style={[styles.label, { color: t.ink }]}>Descripción</Text><TextInput accessibilityLabel="Descripción de la incidencia" placeholder="Describe lo que has visto y cualquier detalle que pueda ayudarnos" placeholderTextColor={t.muted} multiline value={form.description} onChangeText={form.setDescription} style={[styles.input, styles.textarea, { color: t.ink, backgroundColor: t.surface, borderColor: t.line }]} /><Text style={[styles.hint, { color: t.muted }]}>Cuantos más detalles nos des, mejor podremos entender el problema.</Text></View>
          {canUploadAttachments() && <View style={styles.field}>
            <Text style={[styles.label, { color: t.ink }]}>Fotos y vídeos</Text>
            <Text style={[styles.hint, { color: t.muted }]}>Opcional. Hasta {MAX_ATTACHMENTS} archivos JPEG, PNG, MP4 o MOV; máximo 10 MiB cada uno.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar fotos y vídeos"
              accessibilityState={{ disabled: fieldsLocked || form.attachments.length >= MAX_ATTACHMENTS }}
              disabled={fieldsLocked || form.attachments.length >= MAX_ATTACHMENTS}
              onPress={() => void form.pickAttachments()}
              style={({ pressed }) => [styles.input, { alignSelf: 'flex-start', justifyContent: 'center', backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[styles.link, { color: t.accent }]}>Seleccionar fotos y vídeos</Text>
            </Pressable>
            {form.attachments.map(attachment => <ReportAttachmentPreview key={attachment.key} attachment={attachment}
              uploaded={form.uploadedKeys.includes(attachment.key)} disabled={fieldsLocked}
              onRemove={() => form.removeAttachment(attachment.key)} />)}
            {!!form.error && <Text accessibilityRole="alert" style={[styles.error, { color: t.error }]}>{form.error}</Text>}
          </View>}
        </View>}
        {step === 1 && <View accessibilityRole="radiogroup" style={styles.optionList}>{form.categories.map(item => {
          const selected = form.category === item.value;
          const detail = categoryDetails[item.value];
          const Icon = detail.icon;
          return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { form.setCategory(item.value); setValidation(''); }} style={({ pressed }) => [styles.option, { backgroundColor: selected ? t.softAccent : t.surface, borderColor: selected ? t.accent : t.line, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.optionIcon, { backgroundColor: selected ? t.accentSurface : t.backgroundElement }]}><Icon size={22} strokeWidth={1.7} color={selected ? t.accentContrast : t.accent} /></View>
            <View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: t.ink }]}>{item.label}</Text><Text style={[styles.optionDetail, { color: t.muted }]}>{detail.description}</Text></View>
            {selected && <Check size={21} strokeWidth={2.2} color={t.accent} />}
          </Pressable>;
        })}</View>}
        {step === 2 && <View style={styles.formGroup}><View style={styles.field}><Text style={[styles.label, { color: t.ink }]}>Fecha y hora</Text><Text style={[styles.hint, { color: t.muted }]}>Puedes modificar la fecha y la hora si ocurrió antes.</Text><IncidentDateTimePicker value={form.registeredAt} onChange={form.setRegisteredAt} disabled={form.busy} /></View></View>}
        {step === 3 && <View style={styles.formGroup}>
          <View accessibilityRole="radiogroup" style={styles.optionList}>{locationOptions.map(item => {
            const selected = location.mode === item.value;
            const Icon = item.icon;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { location.selectMode(item.value); setValidation(''); }} style={({ pressed }) => [styles.option, { backgroundColor: selected ? t.softAccent : t.surface, borderColor: selected ? t.accent : t.line, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.optionIcon, { backgroundColor: selected ? t.accentSurface : t.backgroundElement }]}><Icon size={22} strokeWidth={1.7} color={selected ? t.accentContrast : t.accent} /></View><View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: t.ink }]}>{item.label}</Text><Text style={[styles.optionDetail, { color: t.muted }]}>{item.detail}</Text></View>{selected && <Check size={21} strokeWidth={2.2} color={t.accent} />}</Pressable>;
          })}</View>
          {location.mode === 'assets' ? <View style={[styles.noticeBox, { backgroundColor: t.backgroundElement }]}><Text style={[styles.optionTitle, { color: t.ink }]}>Activos cercanos aún no disponibles</Text><Text style={[styles.hint, { color: t.muted }]}>Mientras tanto, puedes marcar el lugar en el mapa.</Text><Pressable accessibilityRole="button" onPress={() => location.selectMode('map')}><Text style={[styles.link, { color: t.accent }]}>Seleccionar en el mapa</Text></Pressable></View> : <View style={styles.field}>
            {location.status === 'loading' && <View style={styles.inline}><ActivityIndicator color={t.accent} /><Text style={[styles.hint, { color: t.muted }]}>Buscando tu ubicación…</Text></View>}
            {(location.status === 'denied' || location.status === 'error') && <View style={[styles.noticeBox, { backgroundColor: t.warningSurface }]}><Text accessibilityRole="alert" style={{ color: t.ink }}>{location.status === 'denied' ? 'No se ha concedido el permiso de ubicación.' : 'No hemos podido obtener tu ubicación.'} Puedes seleccionar el lugar en el mapa.</Text><View style={styles.inline}>{!location.canAskAgain && location.status === 'denied' ? <Pressable onPress={() => void Linking.openSettings()}><Text style={[styles.link, { color: t.accent }]}>Abrir ajustes</Text></Pressable> : <Pressable onPress={() => void location.locate()}><Text style={[styles.link, { color: t.accent }]}>Reintentar</Text></Pressable>}<Pressable onPress={() => location.selectMode('map')}><Text style={[styles.link, { color: t.accent }]}>Usar mapa</Text></Pressable></View></View>}
            <Text style={[styles.hint, { color: t.muted }]}>Toca el mapa para marcar o ajustar la ubicación.</Text><LocationMap coordinate={location.coordinate} onSelect={location.selectCoordinate} />
            <Text selectable style={[styles.hint, { color: t.muted }]}>{location.streetStatus === 'loading' ? 'Buscando la calle…' : location.street || (location.coordinate ? `Ubicación seleccionada: ${location.coordinate.latitude.toFixed(5)}, ${location.coordinate.longitude.toFixed(5)}` : 'Todavía no has seleccionado una ubicación.')}</Text>
          </View>}
        </View>}
        {step === 4 && <View style={{ height: ticketSize.height + PAPER_SCROLL_EXTENSION }} onLayout={event => { const { x, y, width } = event.nativeEvent.layout; setTicketSlot(current => current.x === x && current.y === y && current.width === width ? current : { x, y, width }); }} />}
        {!!validation && <Text accessibilityRole="alert" style={[styles.error, { color: t.error }]}>{validation}</Text>}
      </ScrollView>
      {step === 4 && !finishedIncident && ticketSlot.width > 0 && <View pointerEvents="box-none" {...wheelProps} {...paperScroll.panHandlers} style={[styles.paperViewport, motion.active ? { top: 0, bottom: 0, overflow: 'visible' } : { top: viewport.y, height: viewport.height, overflow: 'hidden' }]}>
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, motion.active && sheetOffset ? { transform: [{ translateY: Animated.multiply(sheetOffset, -1) }] } : undefined]}>
        <Animated.View style={[styles.paperStack, { position: 'absolute', left: ticketSlot.x, top: ticketSlot.y + (motion.active ? viewport.y : 0), width: ticketSlot.width, transform: [{ translateY: Animated.multiply(scrollOffset, -1) }] }]} pointerEvents={motion.active ? 'none' : 'auto'}>
          <Animated.View style={{ opacity: motion.fade, transform: [{ translateY: motion.ticket.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 8, -flightDistance] }) }] }} onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setTicketSize(current => current.width === width && current.height === height ? current : { width, height });
        }}>
          {ticketSize.width > 0 && <TicketBackground width={ticketSize.width} height={ticketSize.height} color={t.ticketPaper} ink={t.ticketInk} showTearEdge />}
          <IncidentTicketContent draft incident={{ title: form.title, description: form.description, category: form.category, status: null, registeredAt: form.registeredAt.toISOString(), latitude: location.coordinate?.latitude ?? null, longitude: location.coordinate?.longitude ?? null, normalizedAddress: location.street }} onChangeLocation={() => { if (!fieldsLocked) setStep(3); }} />
          <View style={{ height: TICKET_EDGE_HEIGHT }} /></Animated.View>
          {ticketSize.width > 0 && <Animated.View pointerEvents="none" style={[styles.ticketStrip, { top: ticketSize.height - TICKET_EDGE_HEIGHT, width: ticketSize.width, height: stripHeight, opacity: motion.fade, transformOrigin: [ticketSize.width, 0, 0], transform: [
            { translateY: motion.fall.interpolate({ inputRange: [0, 1], outputRange: [0, windowHeight + stripHeight] }) },
            { translateX: motion.fall.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
            { rotate: Animated.add(motion.tear, motion.fall).interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '-2deg', '-10deg'] }) },
          ] }]}><TicketStrip width={ticketSize.width} height={stripHeight} color={t.ticketPaper} ink={t.ticketInk} />
            <Animated.View pointerEvents="none" style={[styles.tearClip, { width: ticketSize.width, transform: [{ translateX: tearOffset }] }]}>
              <Animated.View style={[styles.attachedSwatch, { transform: [{ translateX: Animated.multiply(tearOffset, -1) }] }]}>
                <PaperSwatch width={ticketSize.width} height={TICKET_EDGE_HEIGHT + 2} color={t.ticketPaper} ink={t.ticketInk} guideColor={t.ticketLine} />
              </Animated.View>
            </Animated.View>
          </Animated.View>}
        </Animated.View>
        </Animated.View>
      </View>}
      <View pointerEvents="box-none" style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {!!form.error && step === 4 && <View style={[styles.errorBanner, { backgroundColor: t.surface, borderColor: t.error }]}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" selectable style={[styles.error, { color: t.error }]}>{form.error}</Text>
          {form.createdIncidentId && form.attachments.filter(attachment => !form.uploadedKeys.includes(attachment.key)).map(attachment =>
            <Pressable key={attachment.key} accessibilityRole="button" accessibilityLabel={`Omitir ${attachment.name}`}
              disabled={form.busy} onPress={() => form.removeAttachment(attachment.key)}>
              <Text style={[styles.link, { color: t.accent }]}>Omitir {attachment.name}</Text>
            </Pressable>)}
        </View>}
        <Animated.View pointerEvents={motion.active ? 'none' : 'auto'} style={{ opacity: motion.button, transform: [{ scale: motion.button.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}><GlassSurface refractive style={[styles.primaryGlass, { borderColor: t.glassEdge }]}><Pressable accessibilityRole="button" accessibilityState={{ disabled: primaryDisabled, busy: form.busy || preparing || (step === 3 && resolving) }} disabled={primaryDisabled} onPress={() => step === 4 ? void submit() : next()} style={({ pressed }) => [styles.primaryButton, { opacity: pressed || primaryDisabled ? 0.65 : 1 }]}>

          {form.busy || preparing || (step === 3 && resolving) ? <ActivityIndicator color={t.accent} /> : <><Text style={[styles.buttonText, { color: t.ink }]}>{step === 4 ? form.createdIncidentId ? 'Reintentar archivos pendientes' : 'Reportar incidencia' : 'Siguiente'}</Text><SymbolView name={{ ios: step === 4 ? 'checkmark' : 'arrow.right', android: step === 4 ? 'check' : 'arrow_forward', web: step === 4 ? 'check' : 'arrow_forward' }} size={19} tintColor={t.accent} /></>}
        </Pressable></GlassSurface></Animated.View>
      </View>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 }, iconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, topLabel: { flex: 1, fontSize: 15, fontWeight: '700' }, stepCount: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }, progress: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, marginTop: 20 }, progressSegment: { height: 4, flex: 1, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 112, gap: 24, flexGrow: 1 }, intro: { gap: 8 }, heading: { fontSize: 30, lineHeight: 37, fontWeight: '700', letterSpacing: -0.5 }, description: { fontSize: 15, lineHeight: 22 }, formGroup: { gap: 22 }, field: { gap: 9 }, label: { fontSize: 14, fontWeight: '700' }, input: { minHeight: 54, borderWidth: 1, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 }, textarea: { minHeight: 180, textAlignVertical: 'top' }, hint: { fontSize: 13, lineHeight: 19 },
  optionList: { gap: 10 }, option: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 16, borderCurve: 'continuous' }, optionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { fontSize: 15, fontWeight: '700' }, optionDetail: { fontSize: 13, lineHeight: 18 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 10, height: 10, borderRadius: 5 }, inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 }, noticeBox: { padding: 16, borderRadius: 14, gap: 8 }, notice: { padding: 14, borderRadius: 12, overflow: 'hidden', fontSize: 14, lineHeight: 20 }, link: { fontSize: 14, fontWeight: '700', paddingVertical: 4 }, error: { fontSize: 14, lineHeight: 20 },
  tearClip: { position: 'absolute', top: -1, left: 0, height: TICKET_EDGE_HEIGHT + 2, overflow: 'hidden' },
  attachedSwatch: { height: TICKET_EDGE_HEIGHT + 2, borderLeftWidth: 0.75, borderRightWidth: 0.75, borderColor: 'rgba(0, 0, 0, 0.07)' },
  paperViewport: { position: 'absolute', left: 0, right: 0, zIndex: 10 }, paperStack: { paddingBottom: PAPER_SCROLL_EXTENSION }, ticketStrip: { position: 'absolute', left: 0 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, gap: 8, zIndex: 20 }, errorBanner: { padding: 12, borderWidth: 1, borderRadius: 12 }, primaryGlass: { borderRadius: 30, borderCurve: 'continuous', borderWidth: 1, boxShadow: '0 7px 20px rgba(15, 56, 58, 0.14)' }, primaryButton: { minHeight: 56, borderRadius: 30, borderCurve: 'continuous', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, buttonText: { fontSize: 16, fontWeight: '700' },
});

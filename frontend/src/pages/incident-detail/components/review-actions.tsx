import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { categories } from '@/pages/report/services/report-service';
import { apiRequest } from '@/services/api-client';
import type { IncidentDetail } from '@/types/incidents';

export function ReviewActions({ incident, onDone }: { incident: IncidentDetail; onDone: () => void }) {
  const theme = useTheme();
  const [category, setCategory] = useState(incident.category ?? '');
  const [priority, setPriority] = useState(incident.priority ?? 'MEDIUM');
  const [latitude, setLatitude] = useState(String(incident.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(incident.longitude ?? ''));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputStyle = { color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 10 };
  const send = async (action: string, body?: object) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      await apiRequest(`/api/operator/reviews/${encodeURIComponent(incident.id)}/${action}`, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
      if (action === 'request-information') { setMessage('Solicitud registrada.'); setReason(''); }
      else onDone();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se ha podido completar la acción.'); }
    finally { setBusy(false); }
  };
  const button = (text: string, action: () => void) => <Pressable accessibilityRole="button" disabled={busy} onPress={action} style={{ paddingVertical: 8 }}><ThemedText type="linkPrimary">{text}</ThemedText></Pressable>;
  const save = () => {
    const lat = Number(latitude), lon = Number(longitude);
    if (!category || !latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) { setMessage('Revisa la categoría y las coordenadas.'); return; }
    send('edit', { category, priority, latitude: lat, longitude: lon });
  };
  const withReason = (action: string) => {
    if (!reason.trim()) { setMessage('Introduce un motivo.'); return; }
    send(action, { reason: reason.trim() });
  };
  return <View style={{ gap: 8 }}><ThemedText type="subtitle">Revisión inicial</ThemedText>
    <ThemedText>Categoría</ThemedText><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{categories.map(item => <Pressable key={item.value} onPress={() => setCategory(item.value)} accessibilityRole="button" accessibilityState={{ selected: category === item.value }}><ThemedText style={{ color: category === item.value ? theme.accent : theme.text }}>{item.label}</ThemedText></Pressable>)}</View>
    <ThemedText>Prioridad</ThemedText><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[['LOW','Baja'], ['MEDIUM','Media'], ['HIGH','Alta'], ['CRITICAL','Crítica']].map(([value, label]) => <Pressable key={value} onPress={() => setPriority(value)} accessibilityRole="button" accessibilityState={{ selected: priority === value }}><ThemedText style={{ color: priority === value ? theme.accent : theme.text }}>{label}</ThemedText></Pressable>)}</View>
    <ThemedText>Latitud</ThemedText><TextInput accessibilityLabel="Latitud" style={inputStyle} value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
    <ThemedText>Longitud</ThemedText><TextInput accessibilityLabel="Longitud" style={inputStyle} value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
    {button('Guardar cambios', save)}
    <ThemedText>Motivo del rechazo o solicitud</ThemedText><TextInput accessibilityLabel="Motivo" style={inputStyle} value={reason} onChangeText={setReason} multiline maxLength={2000} />
    {button('Solicitar información adicional', () => withReason('request-information'))}
    {button('Rechazar incidencia', () => withReason('reject'))}
    {button('Validar incidencia', () => send('validate'))}
    {!!message && <ThemedText accessibilityRole="alert">{message}</ThemedText>}
  </View>;
}

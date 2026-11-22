import { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { categories, createIncident, type Category } from '../services/report-service';
import { MAX_ATTACHMENTS, prepareAttachments, uploadPendingAttachments, type ReportAttachment } from '../services/report-attachments';
import type { Coordinate } from './use-report-location';

export function useReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [registeredAt, setRegisteredAt] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const pending = useRef(false);
  const incidentId = useRef<string | null>(null);
  const uploaded = useRef(new Set<string>());

  async function pickAttachments() {
    if (pending.current || incidentId.current || attachments.length >= MAX_ATTACHMENTS) return;
    setError('');
    try {
      if (process.env.EXPO_OS === 'ios') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Permite el acceso a tus fotos y vídeos para poder adjuntarlos.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_ATTACHMENTS - attachments.length,
        quality: 1,
      });
      if (!result.canceled) {
        const selected = prepareAttachments(result.assets, attachments.length);
        setAttachments(current => [...current, ...selected]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se han podido seleccionar los archivos.');
    }
  }

  function removeAttachment(key: string) {
    if (pending.current || uploaded.current.has(key)) return;
    setAttachments(current => current.filter(attachment => attachment.key !== key));
    setError('');
  }

  async function submit(coordinate: Coordinate | null, normalizedAddress: string | null) {
    if (pending.current) return false;
    setSuccess(false);
    if (!incidentId.current && (!title.trim() || !description.trim() || !category || !coordinate)) {
      setError('Completa el título, la descripción, la categoría y la ubicación.'); return false;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      if (!incidentId.current) {
        const created = await createIncident({ title: title.trim(), description: description.trim(), category: category!, registeredAt: registeredAt.toISOString(), normalizedAddress, ...coordinate! });
        incidentId.current = created.id;
        setCreatedIncidentId(created.id);
      }
      await uploadPendingAttachments(incidentId.current, attachments, uploaded.current,
        () => setUploadedKeys([...uploaded.current]));
      incidentId.current = null;
      uploaded.current.clear();
      setCreatedIncidentId(null);
      setUploadedKeys([]);
      setAttachments([]);
      setTitle(''); setDescription(''); setCategory(null); setRegisteredAt(new Date()); setSuccess(true);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se ha podido enviar la incidencia.';
      setError(incidentId.current ? `La incidencia se creó, pero quedan archivos por subir. ${message}` : message);
      return false;
    }
    finally { pending.current = false; setBusy(false); }
  }
  return { title, setTitle, description, setDescription, category, setCategory, categories, registeredAt, setRegisteredAt, attachments, uploadedKeys, createdIncidentId, pickAttachments, removeAttachment, busy, error, success, submit };
}

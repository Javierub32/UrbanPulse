import { useRef, useState } from 'react';
import { categories, createIncident, type Category } from '../services/report-service';
import type { Coordinate } from './use-report-location';

export function useReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [registeredAt, setRegisteredAt] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);

  async function submit(coordinate: Coordinate | null, normalizedAddress: string | null) {
    if (pending.current) return false;
    setSuccess(false);
    if (!title.trim() || !description.trim() || !category || !coordinate) {
      setError('Completa el título, la descripción, la categoría y la ubicación.'); return false;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      await createIncident({ title: title.trim(), description: description.trim(), category, registeredAt: registeredAt.toISOString(), normalizedAddress, ...coordinate });
      setTitle(''); setDescription(''); setCategory(null); setRegisteredAt(new Date()); setSuccess(true);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido enviar la incidencia.'); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  return { title, setTitle, description, setDescription, category, setCategory, categories, registeredAt, setRegisteredAt, busy, error, success, submit };
}

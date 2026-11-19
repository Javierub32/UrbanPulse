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
  const pending = useRef(false);

  async function submit(coordinate: Coordinate | null, normalizedAddress: string | null) {
    if (pending.current) return null;
    if (!title.trim() || !description.trim() || !category || !coordinate) {
      setError('Completa el título, la descripción, la categoría y la ubicación.'); return null;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      const created = await createIncident({ title: title.trim(), description: description.trim(), category, registeredAt: registeredAt.toISOString(), normalizedAddress, ...coordinate });
      return { ...created, normalizedAddress };
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido enviar la incidencia.'); return null; }
    finally { pending.current = false; setBusy(false); }
  }
  return { title, setTitle, description, setDescription, category, setCategory, categories, registeredAt, setRegisteredAt, busy, error, submit };
}

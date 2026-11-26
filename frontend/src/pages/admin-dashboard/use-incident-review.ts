import { useCallback, useEffect, useRef, useState } from 'react';

import { getIncidentDetail } from '@/pages/incident-detail/services/incident-detail-service';
import { ApiError } from '@/services/api-client';
import type { IncidentDetail } from '@/types/incidents';

import { useAdminIncidents } from './admin-incidents-context';
import { submitReview, type ReviewCommand } from './review-service';

type ReadError = { message: string; retryable: boolean };
type DetailResult = { attempt: number; incident?: IncidentDetail; error?: ReadError };

const confirmations: Record<ReviewCommand['action'], string> = {
  edit: 'Cambios guardados.',
  'request-information': 'Solicitud registrada en el historial.',
  reject: 'Incidencia descartada.',
  validate: 'Incidencia validada.',
  assign: 'Incidencia asignada.',
};

function detailError(cause: unknown): ReadError {
  const code = cause instanceof ApiError ? cause.status : 0;
  if (code === 404) return { message: 'No se ha encontrado la incidencia.', retryable: false };
  if (code === 403) return { message: 'No tienes permiso para consultar esta incidencia.', retryable: false };
  if (code === 400) return { message: 'Identificador de incidencia no válido.', retryable: false };
  return {
    message: cause instanceof Error ? cause.message : 'No se ha podido cargar la incidencia.',
    retryable: true,
  };
}

export function useIncidentReview(id: string | undefined) {
  const { retry: refreshList } = useAdminIncidents();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DetailResult>();
  const [busy, setBusy] = useState<ReviewCommand['action'] | null>(null);
  const [notice, setNotice] = useState<{ text: string; conflict?: boolean }>();
  const [actionError, setActionError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(() => setAttempt((current) => current + 1), []);
  const clearFeedback = () => { setActionError(''); setNotice(undefined); };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    getIncidentDetail(id, controller.signal).then((incident) => {
      if (!controller.signal.aborted) setResult({ attempt, incident });
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      const error = detailError(cause);
      setResult((previous) => ({ attempt, incident: error.retryable ? previous?.incident : undefined, error }));
    });
    return () => controller.abort();
  }, [id, attempt]);

  const incident = result?.incident;
  const loading = !!id && result?.attempt !== attempt;
  const readError = id
    ? (loading ? undefined : result?.error)
    : { message: 'Identificador de incidencia no válido.', retryable: false };
  const reviewable = incident?.status === 'REPORTED';
  const assignable = incident?.status === 'VALIDATED';
  const locked = busy !== null || loading || !!readError;

  async function submit(command: ReviewCommand) {
    const allowed = command.action === 'assign' ? assignable : reviewable;
    if (!id || !allowed || locked || inFlight.current) return false;
    inFlight.current = true;
    setBusy(command.action);
    clearFeedback();
    try {
      await submitReview(id, command);
      if (command.action !== 'request-information') refreshList();
      if (!mounted.current) return false;
      setNotice({ text: confirmations[command.action] });
      refresh();
      return true;
    } catch (cause) {
      if (!mounted.current) return false;
      if (cause instanceof ApiError && cause.status === 409) {
        refreshList();
        setNotice({ text: 'La incidencia ha cambiado. Se está actualizando su estado.', conflict: true });
        refresh();
        return true;
      }
      const fields = cause instanceof ApiError ? Object.values(cause.fields) : [];
      setActionError(fields.length ? fields.join(' ') : cause instanceof Error ? cause.message : 'No se ha podido completar la acción.');
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  return { incident, busy, loading, readError, notice, actionError, reviewable, assignable, locked, refresh, clearFeedback, submit };
}

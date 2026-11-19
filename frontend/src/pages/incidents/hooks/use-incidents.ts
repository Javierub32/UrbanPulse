import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getIncidents } from '@/pages/report/services/report-service';
import type { IncidentListItem } from '@/types/incidents';

export type IncidentsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: IncidentListItem[] };

export function useIncidents() {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<IncidentsState>({ status: 'loading' });

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    let isActive = true;
    setState({ status: 'loading' });

    getIncidents(controller.signal)
      .then((data) => {
        if (isActive) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!isActive || controller.signal.aborted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'No se han podido cargar las incidencias.',
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  // Changing retryKey restarts the focused request when the user retries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]));

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);
  const addCreatedIncident = useCallback((created: IncidentListItem) => {
    if (state.status !== 'success') {
      retry();
      return;
    }
    setState(current => current.status === 'success' ? {
      status: 'success',
      data: [...current.data.filter(incident => incident.id !== created.id), created],
    } : current);
  }, [state.status, retry]);
  return { state, retry, addCreatedIncident };
}

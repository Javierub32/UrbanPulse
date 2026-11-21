import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { getIncidentPage, getIncidentSummary, incidentSearch, type IncidentFilters, type IncidentSummary } from '@/services/incidents-service';
import type { IncidentListItem } from '@/types/incidents';

type ReadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

type IncidentList = {
  items: IncidentListItem[];
  nextPageToken: string | null;
  totalElements: number | null;
  loadingMore?: boolean;
  moreError?: string;
};

const loading = { status: 'loading' } as const;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'No se han podido cargar las incidencias.';

export function useIncidents(filters: IncidentFilters = {}, enabled = true, revision = 0) {
  const account = useAuth().user?.id;
  const search = incidentSearch(filters);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([account, search, enabled, revision, attempt]);
  const [result, setResult] = useState<{ key: string; state: ReadState<IncidentList> }>();
  const request = useRef<{ key: string; controller: AbortController; loadingMore: boolean } | null>(null);
  const state = result?.key === key ? result.state : loading;

  useFocusEffect(useCallback(() => {
    if (!enabled || !account) return;

    const controller = new AbortController();
    request.current = { key, controller, loadingMore: false };
    setResult({ key, state: loading });
    getIncidentPage(search, null, controller.signal).then((page) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: 'success', data: page } });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: 'error', message: errorMessage(error) } });
    });
    return () => {
      controller.abort();
      request.current = null;
    };
  }, [account, enabled, key, search]));

  const retry = () => setAttempt((current) => current + 1);

  async function loadMore() {
    const active = request.current;
    if (state.status !== 'success' || !state.data.nextPageToken || !active || active.key !== key || active.loadingMore) return;

    const { data } = state;
    active.loadingMore = true;
    setResult({ key, state: { status: 'success', data: { ...data, loadingMore: true, moreError: undefined } } });
    try {
      const page = await getIncidentPage(search, data.nextPageToken, active.controller.signal);
      if (active.controller.signal.aborted) return;
      const seen = new Set(data.items.map(({ id }) => id));
      setResult({ key, state: { status: 'success', data: {
        items: [...data.items, ...page.items.filter(({ id }) => !seen.has(id))],
        nextPageToken: page.nextPageToken,
        totalElements: data.totalElements,
      } } });
    } catch (error: unknown) {
      if (!active.controller.signal.aborted) {
        setResult({ key, state: { status: 'success', data: { ...data, loadingMore: false, moreError: errorMessage(error) } } });
      }
    } finally {
      active.loadingMore = false;
    }
  }

  return { state, retry, loadMore };
}

export function useIncidentSummary(zone?: string, revision = 0) {
  const account = useAuth().user?.id;
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([account, zone, revision, attempt]);
  const [result, setResult] = useState<{ key: string; state: ReadState<IncidentSummary> }>();

  useFocusEffect(useCallback(() => {
    if (!account) return;

    const controller = new AbortController();
    setResult({ key, state: loading });
    getIncidentSummary(zone, controller.signal).then((summary) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: 'success', data: summary } });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: 'error', message: errorMessage(error) } });
    });
    return () => controller.abort();
  }, [account, key, zone]));

  return { state: result?.key === key ? result.state : loading, retry: () => setAttempt((current) => current + 1) };
}

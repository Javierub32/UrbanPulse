import { apiRequest } from '@/services/api-client';
import type { IncidentListItem } from '@/types/incidents';

export type IncidentFilters = {
  size?: number;
  statuses?: readonly string[];
  category?: string;
  query?: string;
  since?: string | null;
  until?: string | null;
  includeTotal?: boolean;
};

type IncidentPage = {
  items: IncidentListItem[];
  nextPageToken: string | null;
  totalElements: number | null;
};

export type IncidentSummary = {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
};

export function incidentSearch(filters: IncidentFilters) {
  const params = new URLSearchParams({ size: String(filters.size ?? 12) });
  filters.statuses?.forEach((status) => params.append('status', status));
  if (filters.category) params.set('category', filters.category);
  if (filters.query?.trim()) params.set('q', filters.query.trim());
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.includeTotal) params.set('includeTotal', 'true');
  return params.toString();
}

export function getIncidentPage(search: string, pageToken: string | null, signal: AbortSignal) {
  const params = new URLSearchParams(search);
  if (pageToken !== null) {
    params.set('pageToken', pageToken);
    params.delete('includeTotal');
  }
  return apiRequest<IncidentPage>('/api/incidents?' + params.toString(), { signal });
}

export function getIncidentSummary(zone: string | undefined, signal: AbortSignal) {
  const query = zone ? '?' + new URLSearchParams({ zone }).toString() : '';
  return apiRequest<IncidentSummary>('/api/incidents/summary' + query, { signal });
}

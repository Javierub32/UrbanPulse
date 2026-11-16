import { apiRequest } from '@/services/api-client';
import type { IncidentDetail } from '@/types/incidents';

export function getIncidentDetail(id: string, signal?: AbortSignal) {
  return apiRequest<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}`, { signal });
}

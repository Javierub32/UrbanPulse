import { apiRequest } from '@/services/api-client';
import type { Coordinate } from '../hooks/use-report-location';
import type { IncidentListItem } from '@/types/incidents';

export const categories = [
  { value: 'PUBLIC_ROAD', label: 'Vía pública' },
  { value: 'STREET_LIGHTING', label: 'Alumbrado' },
  { value: 'TRAFFIC', label: 'Tráfico' },
  { value: 'GREEN_AREAS', label: 'Zonas verdes' },
  { value: 'CLEANING', label: 'Limpieza' },
  { value: 'WASTE', label: 'Residuos' },
  { value: 'STREET_FURNITURE', label: 'Mobiliario urbano' },
  { value: 'OTHER', label: 'Otra' },
] as const;
export type Category = (typeof categories)[number]['value'];
type Incident = Coordinate & { title: string; description: string; category: Category };

export function createIncident(incident: Incident) {
  return apiRequest<{ id: string }>('/api/incidents/create', { method: 'POST', body: JSON.stringify(incident) });
}

export async function getIncidents(signal?: AbortSignal): Promise<IncidentListItem[]> {
  return apiRequest<IncidentListItem[]>('/api/incidents/public', { signal });
}

import type { IncidentHistoryEntry } from '@/types/incidents';

/** Texto de las acciones de revisión que no son un cambio de estado. */
export function reviewHistoryLabel(action: IncidentHistoryEntry['action']) {
  if (action === 'INFORMATION_REQUESTED') return 'Información adicional solicitada';
  if (action === 'INCIDENT_EDITED') return 'Información de la incidencia editada';
  return null;
}

const labels: Record<string, string> = {
  REPORTED: 'Registrada',
  VALIDATED: 'Validada',
  REJECTED: 'Rechazada',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  REOPENED: 'Reabierta',
  CLOSED: 'Cerrada',
};

export const incidentStatusOptions = Object.entries(labels).map(([value, label]) => ({ value, label }));

export function incidentStatus(status: string | null) {
  return status ? labels[status] ?? status : 'Estado no disponible';
}

export function incidentStatusTone(status: string | null): 'danger' | 'warning' | 'success' | 'muted' {
  if (status === 'REPORTED' || status === 'REOPENED') return 'danger';
  if (status === 'VALIDATED' || status === 'ASSIGNED' || status === 'IN_PROGRESS') return 'warning';
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success';
  return 'muted';
}

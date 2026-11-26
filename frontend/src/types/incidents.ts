export type IncidentLocation = {
  id: string;
  latitude: number;
  longitude: number;
};

export type IncidentListItem = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  registeredAt: string | null;
  latitude: number | null;
  longitude: number | null;
  normalizedAddress?: string | null;
};

export type IncidentAssignment = {
  department: string | null;
  team: string | null;
  technicianId: string | null;
  technicianName: string | null;
};

// En la revisión inicial, `action` vale INCIDENT_EDITED, VALIDATED, REJECTED o
// INFORMATION_REQUESTED; en una edición, `reason` lista los campos cambiados. `actorName` solo llega a operadores.
export type IncidentHistoryEntry = {
  previousStatus: string | null;
  status: string | null;
  changedAt: string | null;
  actorId: string | null;
  actorName: string | null;
  reason: string | null;
  action: string | null;
  assignment?: IncidentAssignment | null;
};

export type IncidentDetail = IncidentListItem & {
  description: string | null;
  normalizedAddress: string | null;
  priority: string | null;
  updatedAt: string | null;
  history: IncidentHistoryEntry[];
  atmosphericData: { key: string; value: string; unit: string; source: string; observedAt: string | null }[];
};

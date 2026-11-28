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

// Contrato de la revisión inicial (PR #52): `action` vale INCIDENT_EDITED, VALIDATED, REJECTED o
// INFORMATION_REQUESTED; en una edición, `reason` lista los campos cambiados. `actorName` solo llega a operadores.
export type IncidentHistoryEntry = {
  previousStatus: string | null;
  status: string | null;
  changedAt: string | null;
  actorId: string | null;
  actorName: string | null;
  reason: string | null;
  action: string | null;
};

export type IncidentDetail = IncidentListItem & {
  description: string | null;
  normalizedAddress: string | null;
  priority: string | null;
  updatedAt: string | null;
  history: IncidentHistoryEntry[];
  atmosphericData: { key: string; value: string; unit: string; source: string; observedAt: string | null }[];
};

export type IncidentAttachment = {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
};

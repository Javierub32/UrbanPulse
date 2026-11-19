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
};

export type IncidentDetail = IncidentListItem & {
  description: string | null;
  normalizedAddress: string | null;
  priority: string | null;
  updatedAt: string | null;
  history: { previousStatus: string | null; status: string; changedAt: string | null; actorId: string | null; actorName: string | null; reason: string | null; action: string | null }[];
  atmosphericData: { key: string; value: string; unit: string; source: string; observedAt: string | null }[];
};

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
  priority: string | null;
  updatedAt: string | null;
  history: { previousStatus: string | null; status: string; changedAt: string | null }[];
};

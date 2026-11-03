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

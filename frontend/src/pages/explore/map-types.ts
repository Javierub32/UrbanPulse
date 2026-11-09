export type MapItem = {
  type: 'incident' | 'cluster'; id: string | null; title: string | null;
  category: string | null; status: string | null; latitude: number; longitude: number; count: number; west: number; south: number; east: number; north: number;
};
export type MapViewport = { west: number; south: number; east: number; north: number; zoom: number };
export type MapProps = {
  items: MapItem[];
  onViewport: (viewport: MapViewport) => void;
  onSelectCluster: (cluster: MapItem) => void;
  onLoaded: () => void; onError: () => void;
  onSelectIncident: (id: string, point: { x: number; y: number }) => void;
};
export function features(items: MapItem[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: 'FeatureCollection', features: items.map(item => ({
    type: 'Feature', properties: { ...item }, geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
  })) };
}

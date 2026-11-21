import type { StyleSpecification } from 'maplibre-gl';

export const MAP_EDGE_TRANSITION_HEIGHT = 56;

export type MapItem = {
  type: 'incident' | 'cluster'; id: string | null; title: string | null;
  category: string | null; status: string | null; latitude: number; longitude: number; count: number; west: number; south: number; east: number; north: number;
};
export type MapViewport = { west: number; south: number; east: number; north: number; zoom: number };
export type MapProps = {
  items: MapItem[];
  mapStyle: StyleSpecification | string;
  bottomInset: number;
  /** `fade` deja ver el fondo en el borde superior (web); `none` pinta el mapa hasta el borde. */
  topEdge?: 'fade' | 'none';
  onViewport: (viewport: MapViewport) => void;
  onSelectCluster: (cluster: MapItem) => void;
  onLoaded: () => void; onError: () => void;
  onSelectIncident: (id: string, point: { x: number; y: number }) => void;
  /** Web: cada valor nuevo reproduce un zoom de entrada suave hacia la zona de referencia. */
  introKey?: number;
  /** Web: cada petición nueva acerca (`delta` > 0) o aleja el mapa. */
  zoomRequest?: { key: number; delta: number };
  /** Web: el puntero entra en una incidencia (`id`) o sale de ella (`null`). */
  onHoverIncident?: (id: string | null, point?: { x: number; y: number }) => void;
};
export function features(items: MapItem[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: 'FeatureCollection', features: items.map(item => ({
    type: 'Feature', properties: { ...item }, geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
  })) };
}

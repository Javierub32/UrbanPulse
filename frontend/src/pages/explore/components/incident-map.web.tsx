import { useEffect, useRef, type CSSProperties } from 'react';
import { Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl';
import { Colors } from '@/constants/theme';
import { features, type MapProps } from '../map-types';

export default function IncidentMap({ items, onLoaded, onError, onSelectIncident, onViewport, onSelectCluster }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbacks = useRef({ onLoaded, onError, onSelectIncident, onViewport, onSelectCluster });
  const latest = useRef(items);
  useEffect(() => { callbacks.current = { onLoaded, onError, onSelectIncident, onViewport, onSelectCluster }; }, [onLoaded, onError, onSelectIncident, onViewport, onSelectCluster]);
  useEffect(() => { latest.current = items; }, [items]);
  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({ container: container.current, style: 'https://tiles.openfreemap.org/styles/liberty', center: [-4.4214, 36.7213], zoom: 12.5 });
    mapRef.current = map;
    const viewport = () => {
      const bounds = map.getBounds();
      callbacks.current.onViewport({ west: Math.max(-180, bounds.getWest()), south: Math.max(-85, bounds.getSouth()), east: Math.min(180, bounds.getEast()), north: Math.min(85, bounds.getNorth()), zoom: Math.max(0, Math.min(22, map.getZoom())) });
    };
    map.on('load', () => {
      map.addSource('incidents', { type: 'geojson', data: features(latest.current) });
      map.addLayer({ id: 'point-halo', type: 'circle', source: 'incidents', filter: ['==', ['get', 'type'], 'incident'], paint: { 'circle-radius': 16, 'circle-color': Colors.light.accent, 'circle-opacity': 0.22 } });
      map.addLayer({ id: 'cluster-halo', type: 'circle', source: 'incidents', filter: ['==', ['get', 'type'], 'cluster'], paint: { 'circle-radius': 27, 'circle-color': Colors.light.accent, 'circle-opacity': 0.22 } });
      map.addLayer({ id: 'points', type: 'circle', source: 'incidents', filter: ['==', ['get', 'type'], 'incident'], paint: { 'circle-radius': 9, 'circle-color': Colors.light.accent, 'circle-stroke-color': Colors.light.accentContrast, 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'point-center', type: 'circle', source: 'incidents', filter: ['==', ['get', 'type'], 'incident'], paint: { 'circle-radius': 2.5, 'circle-color': Colors.light.accentContrast } });
      map.addLayer({ id: 'clusters', type: 'circle', source: 'incidents', filter: ['==', ['get', 'type'], 'cluster'], paint: { 'circle-radius': 20, 'circle-color': Colors.light.accent, 'circle-stroke-color': Colors.light.accentContrast, 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'incidents', filter: ['==', ['get', 'type'], 'cluster'], layout: { 'text-field': ['to-string', ['get', 'count']], 'text-size': 14, 'text-allow-overlap': true }, paint: { 'text-color': Colors.light.accentContrast } });
      map.on('click', 'points', event => { const id = event.features?.[0]?.properties?.id; if (typeof id === 'string') callbacks.current.onSelectIncident(id, event.point); });
      map.on('click', 'clusters', event => { const geometry = event.features?.[0]?.geometry; if (geometry?.type === 'Point') { if (map.getZoom() >= 17) callbacks.current.onSelectCluster(event.features![0].properties as import('../map-types').MapItem); else map.easeTo({ center: geometry.coordinates as [number, number], zoom: Math.min(22, map.getZoom() + 2) }); } });
      callbacks.current.onLoaded(); viewport();
    });
    map.on('moveend', viewport);
    map.on('error', () => { if (!map.isStyleLoaded()) callbacks.current.onError(); });
    return () => { mapRef.current = null; map.remove(); };
  }, []);
  useEffect(() => { const source = mapRef.current?.getSource('incidents') as GeoJSONSource | undefined; source?.setData(features(items)); }, [items]);
  return <div ref={container} role="application" aria-label="Mapa interactivo de incidencias en Málaga" tabIndex={0} style={styles.map} />;
}
const styles: Record<string, CSSProperties> = { map: { position: 'absolute', inset: 0 } };

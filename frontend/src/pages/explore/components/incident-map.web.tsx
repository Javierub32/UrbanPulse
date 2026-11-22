import { useEffect, useRef, type CSSProperties } from 'react';
import { AttributionControl, Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl';
import { Colors } from '@/constants/theme';
import { features, MAP_EDGE_TRANSITION_HEIGHT, type MapProps } from '../map-types';

const CENTER: [number, number] = [-4.4214, 36.7213];
const ZOOM = 12.5;
const INTRO_ZOOM_OUT = 0.6;

/**
 * Zoom de entrada: parte algo más lejos de la zona de referencia y se acerca suavemente. Mientras
 * dura no se informa del área visible, así que las agrupaciones solo se piden al terminar.
 */
function playIntro(map: MapLibreMap, quiet: { current: boolean }, done: () => void) {
  quiet.current = true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    map.jumpTo({ center: CENTER, zoom: ZOOM });
    quiet.current = false;
    done();
    return;
  }
  map.jumpTo({ center: CENTER, zoom: ZOOM - INTRO_ZOOM_OUT });
  map.easeTo({ center: CENTER, zoom: ZOOM, duration: 1100, easing: (t) => 1 - Math.pow(1 - t, 3) });
  map.once('moveend', () => { quiet.current = false; done(); });
}

export default function IncidentMap({ items, mapStyle, bottomInset, topEdge = 'fade', introKey, zoomRequest, onLoaded, onError, onSelectIncident, onHoverIncident, onViewport, onSelectCluster }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbacks = useRef({ onLoaded, onError, onSelectIncident, onHoverIncident, onViewport, onSelectCluster });
  const latest = useRef(items);
  const intro = useRef(introKey);
  const loaded = useRef(false);
  const quiet = useRef(false);
  const reportViewport = useRef<() => void>(() => {});
  useEffect(() => { callbacks.current = { onLoaded, onError, onSelectIncident, onHoverIncident, onViewport, onSelectCluster }; }, [onLoaded, onError, onSelectIncident, onHoverIncident, onViewport, onSelectCluster]);
  useEffect(() => { latest.current = items; }, [items]);
  useEffect(() => {
    if (introKey === undefined || introKey === intro.current) return;
    intro.current = introKey;
    const map = mapRef.current;
    if (!loaded.current || !map) return;
    // Si el mapa estuvo oculto, su tamaño quedó a cero: se recalcula antes de centrarlo.
    const frame = requestAnimationFrame(() => { map.resize(); playIntro(map, quiet, reportViewport.current); });
    return () => cancelAnimationFrame(frame);
  }, [introKey]);
  useEffect(() => {
    if (!zoomRequest || !loaded.current) return;
    mapRef.current?.easeTo({ zoom: Math.max(0, Math.min(22, mapRef.current.getZoom() + zoomRequest.delta)), duration: 300 });
  }, [zoomRequest]);
  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({ container: container.current, style: mapStyle, center: CENTER, zoom: intro.current === undefined ? ZOOM : ZOOM - INTRO_ZOOM_OUT, attributionControl: false });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapRef.current = map;
    let lastViewport = '';
    const viewport = () => {
      if (quiet.current) return;
      const bounds = map.getBounds();
      const next = { west: Math.max(-180, bounds.getWest()), south: Math.max(-85, bounds.getSouth()), east: Math.min(180, bounds.getEast()), north: Math.min(85, bounds.getNorth()), zoom: Math.max(0, Math.min(22, map.getZoom())) };
      // Un reajuste de tamaño sin cambio de zona no vuelve a pedir las incidencias.
      const key = JSON.stringify(next);
      if (key === lastViewport) return;
      lastViewport = key;
      callbacks.current.onViewport(next);
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
      map.on('mouseenter', 'points', event => {
        map.getCanvas().style.cursor = 'pointer';
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === 'string') callbacks.current.onHoverIncident?.(id, event.point);
      });
      map.on('mouseleave', 'points', () => { map.getCanvas().style.cursor = ''; callbacks.current.onHoverIncident?.(null); });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      loaded.current = true;
      reportViewport.current = viewport;
      callbacks.current.onLoaded();
      if (intro.current !== undefined) playIntro(map, quiet, viewport);
      else viewport();
    });
    map.on('moveend', viewport);
    map.on('error', () => { if (!map.isStyleLoaded()) callbacks.current.onError(); });
    return () => { mapRef.current = null; loaded.current = false; map.remove(); };
  }, [mapStyle]);
  useEffect(() => { const source = mapRef.current?.getSource('incidents') as GeoJSONSource | undefined; source?.setData(features(items)); }, [items]);
  return <div ref={container} role="application" aria-label="Mapa interactivo de incidencias en Málaga" tabIndex={0} className="incident-map" style={{ ...styles.map, ...(topEdge === 'none' ? { maskImage: 'none' } : null), '--incident-map-bottom-inset': `${bottomInset}px` } as CSSProperties} />;
}
const styles: Record<string, CSSProperties> = {
  map: {
    position: 'absolute', inset: 0,
    maskImage: `linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.12) 14px, rgba(0, 0, 0, 0.65) 37px, black ${MAP_EDGE_TRANSITION_HEIGHT}px)`,
  },
};

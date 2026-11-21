import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useIncidentMapStyle } from '@/pages/explore/map-style';
import type { Coordinate } from '../hooks/use-report-location';

type Props = { coordinate: Coordinate | null; onSelect?: (coordinate: Coordinate) => void; height?: number | '100%'; ticket?: boolean; showAttribution?: boolean };

export default function LocationMap({ coordinate, onSelect, height = 300, ticket = false, showAttribution = !ticket }: Props) {
  const mapStyle = useIncidentMapStyle();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const canSelect = !ticket && !!onSelect;
  useEffect(() => { marker.current?.setDraggable(canSelect); }, [canSelect]);
  useEffect(() => {
    if (!container.current || !mapStyle) return;
    const instance = new MapLibreMap({
      container: container.current, style: mapStyle,
      center: [-4.4214, 36.7213], zoom: 12.5, interactive: !ticket,
      ...(!showAttribution && { attributionControl: false as const }),
    });
    map.current = instance;
    instance.on('click', (event) => onSelectRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
    instance.on('error', (event) => { if (!instance.isStyleLoaded()) setFailed(true); });
    return () => { marker.current?.remove(); marker.current = null; instance.remove(); map.current = null; };
  }, [mapStyle, ticket, showAttribution]);
  useEffect(() => {
    if (!map.current) return;
    if (!coordinate) { marker.current?.remove(); marker.current = null; return; }
    if (!marker.current) {
      marker.current = new Marker({ color: Colors.light.accent, draggable: !ticket && !!onSelectRef.current }).setLngLat([coordinate.longitude, coordinate.latitude]).addTo(map.current);
      marker.current.on('dragend', () => {
        const point = marker.current?.getLngLat();
        if (point) onSelectRef.current?.({ latitude: point.lat, longitude: point.lng });
      });
    } else marker.current.setLngLat([coordinate.longitude, coordinate.latitude]);
    map.current.flyTo({ center: [coordinate.longitude, coordinate.latitude], zoom: Math.max(map.current.getZoom(), 14) });
  }, [coordinate, mapStyle, ticket, showAttribution]);
  return <div style={{ height, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
    <div ref={container} style={{ width: '100%', height: '100%' }} />
    {failed && <div style={{ position: 'absolute', top: 8, left: 8, right: 8, padding: 8, background: 'white' }}><ThemedText>El mapa no se ha podido cargar. Comprueba tu conexión y vuelve a intentarlo.</ThemedText></div>}
  </div>;
}

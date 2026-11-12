import { useRef } from 'react';
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap, type CameraRef } from '@maplibre/maplibre-react-native';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { features, type MapProps } from '../map-types';

export default function IncidentMap({ items, onLoaded, onError, onSelectIncident, onViewport, onSelectCluster }: MapProps) {
  const camera = useRef<CameraRef>(null);
  const zoom = useRef(12.5);
  return <MapLibreMap accessibilityLabel="Mapa interactivo de incidencias en Málaga"
    mapStyle="https://tiles.openfreemap.org/styles/liberty" onDidFinishLoadingMap={onLoaded}
    onDidFailLoadingMap={onError} style={StyleSheet.absoluteFill}
    onRegionDidChange={event => {
      const { bounds: [west, south, east, north], zoom: z } = event.nativeEvent;
      zoom.current = z;
      onViewport({ west: Math.max(-180, west), south: Math.max(-85, south), east: Math.min(180, east), north: Math.min(85, north), zoom: Math.max(0, Math.min(22, z)) });
    }}>
    <Camera ref={camera} initialViewState={{ center: [-4.4214, 36.7213], zoom: 12.5 }} />
    <GeoJSONSource id="public-incidents" data={features(items)} onPress={event => {
      const feature = event.nativeEvent.features[0];
      if (feature?.properties?.type === 'incident' && typeof feature.properties.id === 'string')
        onSelectIncident(feature.properties.id, { x: event.nativeEvent.point[0], y: event.nativeEvent.point[1] });
      else if (feature?.properties?.type === 'cluster' && feature.geometry.type === 'Point') {
        if (zoom.current >= 17) onSelectCluster(feature.properties as import('../map-types').MapItem);
        else camera.current?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.min(22, zoom.current + 2), duration: 400 });
      }
    }}>
      <Layer id="point-halo" type="circle" filter={['==', ['get', 'type'], 'incident']} paint={{ 'circle-radius': 16, 'circle-color': Colors.light.accent, 'circle-opacity': 0.22 }} />
      <Layer id="cluster-halo" type="circle" filter={['==', ['get', 'type'], 'cluster']} paint={{ 'circle-radius': 27, 'circle-color': Colors.light.accent, 'circle-opacity': 0.22 }} />
      <Layer id="points" type="circle" filter={['==', ['get', 'type'], 'incident']} paint={{ 'circle-radius': 9, 'circle-color': Colors.light.accent, 'circle-stroke-color': Colors.light.accentContrast, 'circle-stroke-width': 2.5 }} />
      <Layer id="point-center" type="circle" filter={['==', ['get', 'type'], 'incident']} paint={{ 'circle-radius': 2.5, 'circle-color': Colors.light.accentContrast }} />
      <Layer id="clusters" type="circle" filter={['==', ['get', 'type'], 'cluster']} paint={{ 'circle-radius': 20, 'circle-color': Colors.light.accent, 'circle-stroke-color': Colors.light.accentContrast, 'circle-stroke-width': 2 }} />
      <Layer id="cluster-count" type="symbol" filter={['==', ['get', 'type'], 'cluster']} layout={{ 'text-field': ['to-string', ['get', 'count']], 'text-size': 14, 'text-allow-overlap': true }} paint={{ 'text-color': Colors.light.accentContrast }} />
    </GeoJSONSource>
  </MapLibreMap>;
}

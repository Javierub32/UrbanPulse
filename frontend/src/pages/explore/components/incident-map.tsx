import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from '@maplibre/maplibre-react-native';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import type { IncidentLocation } from '@/types/incidents';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const INITIAL_MAP_CENTER: [number, number] = [-4.4214, 36.7213];
const INCIDENT_LOCATIONS_SOURCE_ID = 'public-incidents';

function toIncidentFeatureCollection(locations: IncidentLocation[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: locations.map(({ id, latitude, longitude }) => ({
      type: 'Feature',
      id,
      properties: { incidentId: id },
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
    })),
  };
}

export type IncidentMapProps = {
  locations: IncidentLocation[];
  onLoaded: () => void;
  onError: () => void;
  onSelectIncident: (id: string, point: { x: number; y: number }) => void;
};

export default function IncidentMap({ locations, onLoaded, onError, onSelectIncident }: IncidentMapProps) {
  return (
    <MapLibreMap
      accessibilityLabel="Mapa interactivo de incidencias en Málaga"
      mapStyle={MAP_STYLE_URL}
      onDidFinishLoadingMap={onLoaded}
      onDidFailLoadingMap={onError}
      style={StyleSheet.absoluteFill}
    >
      <Camera initialViewState={{ center: INITIAL_MAP_CENTER, zoom: 12.5 }} />
      <GeoJSONSource
        id={INCIDENT_LOCATIONS_SOURCE_ID}
        data={toIncidentFeatureCollection(locations)}
        onPress={(event) => {
          const id = event.nativeEvent.features[0]?.properties?.incidentId;
          if (typeof id === 'string') onSelectIncident(id, { x: event.nativeEvent.point[0], y: event.nativeEvent.point[1] });
        }}
      >
        <Layer
          id="public-incident-points"
          type="circle"
          paint={{
            'circle-radius': 8,
            'circle-color': Colors.light.accent,
            'circle-opacity': 0.96,
            'circle-stroke-color': Colors.light.accentContrast,
            'circle-stroke-width': 2,
          }}
        />
      </GeoJSONSource>
    </MapLibreMap>
  );
}

import { useEffect, useRef, type CSSProperties } from 'react';
import { Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl';

import type { IncidentMapProps } from './incident-map';
import type { IncidentLocation } from '@/types/incidents';
import { Colors } from '@/constants/theme';

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

export default function IncidentMap({ locations, onLoaded, onError }: IncidentMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const locationsRef = useRef(locations);
  const mapLoadedRef = useRef(false);
  locationsRef.current = locations;

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: INITIAL_MAP_CENTER,
      zoom: 12.5,
    });
    mapRef.current = map;

    const handleLoad = () => {
      map.addSource(INCIDENT_LOCATIONS_SOURCE_ID, {
        type: 'geojson',
        data: toIncidentFeatureCollection(locationsRef.current),
      });
      map.addLayer({
        id: 'public-incident-points',
        type: 'circle',
        source: INCIDENT_LOCATIONS_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': Colors.light.accent,
          'circle-opacity': 0.96,
          'circle-stroke-color': Colors.light.accentContrast,
          'circle-stroke-width': 2,
        },
      });
      mapLoadedRef.current = true;
      onLoaded();
    };

    const handleError = () => {
      if (!map.isStyleLoaded()) onError();
    };

    map.once('load', handleLoad);
    map.on('error', handleError);

    return () => {
      map.off('error', handleError);
      mapLoadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [onError, onLoaded]);

  useEffect(() => {
    if (!mapLoadedRef.current) return;
    const source = mapRef.current?.getSource(INCIDENT_LOCATIONS_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    source?.setData(toIncidentFeatureCollection(locations));
  }, [locations]);

  return (
    <div
      ref={mapContainer}
      role="application"
      aria-label="Mapa interactivo de incidencias en Málaga"
      tabIndex={0}
      style={styles.map}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  map: {
    position: 'absolute',
    inset: 0,
  },
};

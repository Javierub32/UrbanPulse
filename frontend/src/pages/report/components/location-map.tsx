import { useEffect, useRef } from 'react';
import { Camera, Map as MapLibreMap, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useIncidentMapStyle } from '@/pages/explore/map-style';
import type { Coordinate } from '../hooks/use-report-location';

type Props = { coordinate: Coordinate | null; onSelect?: (coordinate: Coordinate) => void; height?: number | '100%'; ticket?: boolean; showAttribution?: boolean };

export default function LocationMap({ coordinate, onSelect, height = 300, ticket = false, showAttribution = !ticket }: Props) {
  const mapStyle = useIncidentMapStyle();
  const camera = useRef<CameraRef>(null);
  useEffect(() => {
    if (coordinate) {
      camera.current?.easeTo({ center: [coordinate.longitude, coordinate.latitude], duration: 350 });
    }
  }, [coordinate]);
  return (
    <View style={[styles.container, { height }]}>
      {mapStyle && <MapLibreMap
        accessibilityLabel="Mapa para seleccionar la ubicación de la incidencia"
        mapStyle={mapStyle}
        attribution={showAttribution}
        style={StyleSheet.absoluteFill}
        onPress={event => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          onSelect?.({ latitude, longitude });
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: coordinate ? [coordinate.longitude, coordinate.latitude] : [-4.4214, 36.7213], zoom: 12.5 }}
        />
        {coordinate && (
          <Marker lngLat={[coordinate.longitude, coordinate.latitude]}>
            <View style={styles.marker} />
          </Marker>
        )}
      </MapLibreMap>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { height: 300, overflow: 'hidden', borderRadius: 16, borderCurve: 'continuous' },
  marker: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: Colors.light.accent },
});

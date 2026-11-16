import { useEffect, useRef } from 'react';
import { Camera, Map as MapLibreMap, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';
import type { Coordinate } from '../hooks/use-report-location';

const DEFAULT_COORDINATE = { latitude: 36.7213, longitude: -4.4214 };

type Props = { coordinate: Coordinate | null; onSelect: (coordinate: Coordinate) => void };

export default function LocationMap({ coordinate, onSelect }: Props) {
  const camera = useRef<CameraRef>(null);
  useEffect(() => {
    if (coordinate) {
      camera.current?.easeTo({ center: [coordinate.longitude, coordinate.latitude], duration: 350 });
    }
  }, [coordinate]);
  return (
    <View style={styles.container}>
      <MapLibreMap
        accessibilityLabel="Mapa para seleccionar la ubicación de la incidencia"
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={StyleSheet.absoluteFill}
        onPress={event => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          onSelect({ latitude, longitude });
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: [-4.4214, 36.7213], zoom: 12.5 }}
        />
        {coordinate && (
          <Marker lngLat={[coordinate.longitude, coordinate.latitude]}>
            <View style={styles.marker} />
          </Marker>
        )}
      </MapLibreMap>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { height: 300, overflow: 'hidden', borderRadius: 16, borderCurve: 'continuous' },
  marker: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: '#208AEF' },
});

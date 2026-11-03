import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Coordinate } from '../hooks/use-report-location';

const DEFAULT_COORDINATE = { latitude: 36.7213, longitude: -4.4214 };

type Props = { coordinate: Coordinate | null; onSelect: (coordinate: Coordinate) => void };

export default function LocationMap({ coordinate, onSelect }: Props) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    if (coordinate) map.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 350);
  }, [coordinate]);
  return (
    <View style={styles.container}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={{ ...DEFAULT_COORDINATE, latitudeDelta: 0.08, longitudeDelta: 0.08 }} onPress={(event) => onSelect(event.nativeEvent.coordinate)}>
        {coordinate && <Marker coordinate={coordinate} draggable onDragEnd={(event) => onSelect(event.nativeEvent.coordinate)} title="Ubicación de la incidencia" />}
      </MapView>
    </View>
  );
}
const styles = StyleSheet.create({ container: { height: 300, overflow: 'hidden', borderRadius: 16, borderCurve: 'continuous' } });

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Coordinate = { latitude: number; longitude: number };

export async function getCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { status: 'denied' as const, canAskAgain: permission.canAskAgain };
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    status: 'success' as const,
    coordinate: { latitude: position.coords.latitude, longitude: position.coords.longitude },
  };
}

export async function getStreet(coordinate: Coordinate): Promise<string | null> {
  // Web performs the street lookup on the backend after the incident is saved.
  if (Platform.OS === 'web') return null;

  const [address] = await Location.reverseGeocodeAsync(coordinate);
  if (!address?.street?.trim()) return null;

  return [address.street.trim(), address.streetNumber?.trim()]
    .filter(Boolean)
    .join(' ');
}

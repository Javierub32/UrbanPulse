import * as Location from 'expo-location';

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

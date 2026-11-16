import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getCurrentLocation, getStreet } from '../services/location-service';

export type Coordinate = { latitude: number; longitude: number };
export type LocationMode = 'current' | 'map' | 'assets';

export function useReportLocation() {
  const [mode, setMode] = useState<LocationMode>('map');
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [street, setStreet] = useState<string | null>(null);
  const [streetStatus, setStreetStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle');
  const requestId = useRef(0);

  async function lookupStreet(next: Coordinate, id: number) {
    if (Platform.OS === 'web') return;

    setStreetStatus('loading');
    try {
      const resultStreet = await getStreet(next);
      if (id !== requestId.current) return;
      setStreet(resultStreet);
      setStreetStatus(resultStreet ? 'idle' : 'unavailable');
    } catch {
      if (id === requestId.current) setStreetStatus('unavailable');
    }
  }

  async function locate() {
    const id = ++requestId.current;
    setCoordinate(null);
    setStatus('loading');
    setStreet(null);
    setStreetStatus('idle');
    try {
      const result = await getCurrentLocation();
      if (id !== requestId.current) return;
      if (result.status === 'denied') {
        setCanAskAgain(result.canAskAgain);
        setStatus('denied');
      } else {
        setCoordinate(result.coordinate);
        setStatus('idle');
        await lookupStreet(result.coordinate, id);
      }
    } catch {
      if (id === requestId.current) setStatus('error');
    }
  }

  function selectMode(next: LocationMode) {
    if (next === mode) return;
    requestId.current += 1;
    setStatus('idle');
    setStreet(null);
    setStreetStatus('idle');
    setMode(next);
    if (next === 'current') void locate();
  }

  function selectCoordinate(next: Coordinate) {
    const id = ++requestId.current;
    setStatus('idle');
    setCoordinate(next);
    setStreet(null);
    setStreetStatus('idle');
    void lookupStreet(next, id);
  }

  function reset() {
    requestId.current += 1;
    setCoordinate(null);
    setStatus('idle');
    setStreet(null);
    setStreetStatus('idle');
    setMode('map');
  }

  return { mode, coordinate, status, canAskAgain, street, streetStatus, selectMode, selectCoordinate, locate, reset };
}

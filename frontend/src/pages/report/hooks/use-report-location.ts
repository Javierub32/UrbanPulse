import { useRef, useState } from 'react';
import { getCurrentLocation } from '../services/location-service';

export type Coordinate = { latitude: number; longitude: number };
export type LocationMode = 'current' | 'map' | 'assets';

export function useReportLocation() {
  const [mode, setMode] = useState<LocationMode>('map');
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const requestId = useRef(0);

  async function locate() {
    const id = ++requestId.current;
    setStatus('loading');
    try {
      const result = await getCurrentLocation();
      if (id !== requestId.current) return;
      if (result.status === 'denied') {
        setCanAskAgain(result.canAskAgain);
        setStatus('denied');
      } else {
        setCoordinate(result.coordinate);
        setStatus('idle');
      }
    } catch {
      if (id === requestId.current) setStatus('error');
    }
  }

  function selectMode(next: LocationMode) {
    if (next === mode) return;
    requestId.current += 1;
    setStatus('idle');
    setMode(next);
    if (next === 'current') void locate();
  }

  function selectCoordinate(next: Coordinate) {
    requestId.current += 1;
    setStatus('idle');
    setCoordinate(next);
  }

  function reset() {
    requestId.current += 1;
    setCoordinate(null);
    setStatus('idle');
    setMode('map');
  }

  return { mode, coordinate, status, canAskAgain, selectMode, selectCoordinate, locate, reset };
}

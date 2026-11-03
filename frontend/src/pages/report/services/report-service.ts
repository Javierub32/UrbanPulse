import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Coordinate } from '../hooks/use-report-location';

export const categories = [
  { value: 'PUBLIC_ROAD', label: 'Vía pública' },
  { value: 'STREET_LIGHTING', label: 'Alumbrado' },
  { value: 'TRAFFIC', label: 'Tráfico' },
  { value: 'GREEN_AREAS', label: 'Zonas verdes' },
  { value: 'CLEANING', label: 'Limpieza' },
  { value: 'WASTE', label: 'Residuos' },
  { value: 'STREET_FURNITURE', label: 'Mobiliario urbano' },
  { value: 'OTHER', label: 'Otra' },
] as const;
export type Category = (typeof categories)[number]['value'];
// Usuario sintético creado por la migración V4 para los datos de prueba.
const TEST_USER_ID = 'c861dc90-71ea-44f6-9f39-68c194ef9100';
type Incident = Coordinate & { title: string; description: string; category: Category };

function apiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:8080`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:8080`;
}

async function post<T>(path: string, data: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  } catch {
    throw new Error('No se puede conectar con el servidor. Comprueba la conexión y la dirección de la API.');
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error('No se encuentra el usuario o el servicio solicitado.');
    if (response.status === 400) throw new Error('Revisa los datos introducidos y vuelve a intentarlo.');
    throw new Error('El servidor no ha podido procesar la solicitud. Inténtalo de nuevo.');
  }
  return response.json() as Promise<T>;
}

export function createIncident(incident: Incident) {
  return post<{ id: string }>('/api/incidents/create', { ...incident, userId: TEST_USER_ID });
}

import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function login() {
  if (__ENV.K6_TOKEN) {
    return { token: __ENV.K6_TOKEN };
  }

  const email = __ENV.K6_EMAIL || 'operador1@urbanpulse.invalid';
  const password = __ENV.K6_PASSWORD || 'urbanpulse';
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (response.status !== 200) {
    fail(`El login ha fallado. HTTP ${response.status}`);
  }

  const token = response.json('accessToken');
  if (!token) {
    fail('El login no ha devuelto accessToken');
  }
  return { token };
}

export function getHomeIncidents(data) {
  const response = http.get(`${BASE_URL}/api/incidents?size=12`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  check(response, {
    'el listado devuelve HTTP 200': (r) => r.status === 200,
    'la respuesta contiene una lista items': (r) => {
      try {
        return Array.isArray(r.json('items'));
      } catch (_) {
        return false;
      }
    },
  });
}

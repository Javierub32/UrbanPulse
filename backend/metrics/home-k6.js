import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  vus: 1,
  duration: '30s',

  summaryTrendStats: [
    'avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)',
  ],

  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
  },
};

// Se ejecuta una vez antes de empezar la carga.
export function setup() {
  // Si proporcionas un JWT, lo usa sin hacer login.
  if (__ENV.K6_TOKEN) {
    return { token: __ENV.K6_TOKEN };
  }

  const email = __ENV.K6_EMAIL || 'operador1@urbanpulse.invalid';
  const password = __ENV.K6_PASSWORD || 'urbanpulse';

  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.status !== 200) {
    fail(`El login ha fallado. HTTP ${response.status}`);
  }

  let token;
  try {
    token = response.json('accessToken');
  } catch (_) {
    fail('El login no ha devuelto un JSON válido');
  }

  if (!token) {
    fail('El login no ha devuelto accessToken');
  }

  return { token };
}

// Cada usuario virtual repite esta función durante la prueba.
export default function (data) {
  const response = http.get(`${BASE_URL}/api/incidents?size=12`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
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

  sleep(1);
}
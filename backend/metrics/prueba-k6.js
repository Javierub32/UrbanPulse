import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
    vus: 5,
    duration: '45s',

    // Incluimos p99 porque lo pide la práctica.
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const response = http.get(`${BASE_URL}/actuator/health`);

    check(response, {
        'health devuelve HTTP 200': (r) => r.status === 200,
        'estado UP': (r) => {
            try {
                return r.json('status') === 'UP';
            } catch (_) {
                return false;
            }
        },
    });

    sleep(0.5);
}
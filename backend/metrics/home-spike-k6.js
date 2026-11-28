import { sleep } from 'k6';
import { getHomeIncidents, login } from './home-k6-common.js';

export const options = {
  scenarios: {
    home_spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 1 },
        { duration: '2s', target: 10 },
        { duration: '15s', target: 10 },
        { duration: '2s', target: 1 },
        { duration: '10s', target: 1 },
      ],
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  return login();
}

export default function (data) {
  getHomeIncidents(data);
  sleep(1);
}

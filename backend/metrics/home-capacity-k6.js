import { getHomeIncidents, login } from './home-k6-common.js';

const RATE = Number(__ENV.RATE || 100);
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    home_capacity: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 5,
      maxVUs: 30,
    },
  },
  tags: {
    requested_rate: String(RATE),
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count<20'],
  },
};

export function setup() {
  return login();
}

export default function (data) {
  getHomeIncidents(data);
}

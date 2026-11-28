import { getHomeIncidents, login } from './home-k6-common.js';

export const options = {
  scenarios: {
    home_constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 3,
      maxVUs: 10,
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};

export function setup() {
  return login();
}

export default function (data) {
  getHomeIncidents(data);
}

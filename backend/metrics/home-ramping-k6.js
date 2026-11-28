import { sleep } from 'k6';
import { getHomeIncidents, login } from './home-k6-common.js';

export const options = {
  scenarios: {
    home_ramping: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 3 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 5 },
        { duration: '20s', target: 20 },
        { duration: '10s', target: 15 },
		{ duration: '10s', target: 30 },
		{ duration: '10s', target: 0 },
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

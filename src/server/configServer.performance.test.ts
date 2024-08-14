import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:8888';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'errors': ['rate<0.1'],  // Error rate should be less than 10%
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/archetypes/node-fullstack`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  console.log('Performance Test Summary:');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`95th Percentile Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
}

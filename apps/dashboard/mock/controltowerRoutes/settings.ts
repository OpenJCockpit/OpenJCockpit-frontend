import type { Rec } from '../store';
import { add } from './router';

let policy: Rec = {
  enabled: false,
  url: 'http://localhost:8181',
  decisionPath: '/v1/data/controltower/allow',
  failOpen: false,
};

add('GET', '/settings', () => ({ policy, editable: true }));
add('PUT', '/settings/policy', ({ body }) => {
  policy = { ...policy, ...body };
  return { policy, editable: true };
});
add('POST', '/settings/policy/test', () => ({
  reachable: true,
  message: 'Policy engine reachable.',
  policies: ['controltower/allow'],
}));

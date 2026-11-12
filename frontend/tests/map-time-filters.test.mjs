import test from 'node:test';
import assert from 'node:assert/strict';
import { startOfPeriod } from '../src/pages/explore/time-filters.ts';

test('los periodos móviles usan 7 y 30 días completos', () => {
  const now = new Date('2026-04-15T12:00:00Z');
  assert.equal(startOfPeriod('week', now), '2026-04-08T12:00:00.000Z');
  assert.equal(startOfPeriod('month', now), '2026-03-16T12:00:00.000Z');
  assert.equal(startOfPeriod('all', now), null);
});

test('hoy empieza a medianoche local sin modificar la fecha original', () => {
  const now = new Date(2026, 3, 15, 15, 30);
  const original = now.getTime();
  assert.equal(startOfPeriod('today', now), new Date(2026, 3, 15, 0, 0).toISOString());
  assert.equal(now.getTime(), original);
});

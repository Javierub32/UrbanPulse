import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateBounds, initialFilters, matchesFilters, parseLocalDay, statusGroup, ticketStatusTone } from '../src/pages/incidents/incident-filters.ts';

test('agrupa reabiertas y cerradas sin contar rechazadas como resueltas', () => {
  for (const status of ['REPORTED', 'VALIDATED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED']) assert.equal(statusGroup(status), 'active');
  for (const status of ['RESOLVED', 'CLOSED']) assert.equal(statusGroup(status), 'resolved');
  assert.equal(statusGroup('REJECTED'), 'rejected');
  assert.equal(statusGroup(null), null);
});

test('distingue los colores del ticket según el estado de la incidencia', () => {
  assert.equal(ticketStatusTone('REPORTED'), 'reported');
  for (const status of ['VALIDATED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED']) assert.equal(ticketStatusTone(status), 'progress');
  for (const status of ['RESOLVED', 'CLOSED']) assert.equal(ticketStatusTone(status), 'resolved');
  assert.equal(ticketStatusTone('REJECTED'), 'rejected');
  assert.equal(ticketStatusTone(null), 'unknown');
  assert.equal(ticketStatusTone('UNRECOGNIZED'), 'unknown');
});

test('combina grupo, categoría y fecha y permite restablecer', () => {
  const item = { id: '1', title: 'Aviso', category: 'TRAFFIC', status: 'IN_PROGRESS', registeredAt: '2026-11-15T12:00:00Z', latitude: null, longitude: null };
  const filters = { ...initialFilters, group: 'active', category: 'TRAFFIC', period: 'week' };
  const { since, until } = dateBounds(filters, Date.parse('2026-11-17T12:00:00Z'));
  assert.equal(matchesFilters(item, filters, since, until), true);
  assert.equal(matchesFilters(item, { ...filters, category: 'WASTE' }, since, until), false);
  assert.equal(matchesFilters(item, { ...filters, group: 'resolved' }, since, until), false);
  assert.equal(matchesFilters({ ...item, registeredAt: null }, filters, since, until), false);
  assert.equal(matchesFilters(item, initialFilters, null, null), true);
});

test('el periodo personalizado incluye el día final y rechaza fechas inválidas', () => {
  const day = { ...initialFilters, period: 'custom', from: '2026-10-25', to: '' };
  const { since, until, valid } = dateBounds(day);
  assert.equal(valid, true);
  assert.equal(new Date(since).getHours(), 0);
  assert.equal(new Date(until).getHours(), 0);
  assert.equal(new Date(until).getDate(), 26);
  const item = { id: '1', title: '', category: null, status: 'CLOSED', registeredAt: new Date(new Date(until).getTime() - 1).toISOString(), latitude: null, longitude: null };
  assert.equal(matchesFilters(item, day, since, until), true);
  assert.equal(matchesFilters({ ...item, registeredAt: until }, day, since, until), false);
  assert.equal(dateBounds({ ...day, from: '2026-10-26', to: '2026-10-25' }).valid, false);
  assert.equal(parseLocalDay('2026-02-30'), null);
});

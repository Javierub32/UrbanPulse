import { parseDate } from '@/pages/incidents/incident-filters';
import type { IncidentSummary } from '@/services/incidents-service';

export const SPANS = [7, 14, 30] as const;
export type Span = (typeof SPANS)[number];

export type DayPoint = { key: string; weekday: string; day: string; month: string; count: number };

export const groupStatuses = {
  all: [],
  pending: ['REPORTED', 'REOPENED'],
  inProgress: ['VALIDATED', 'ASSIGNED', 'IN_PROGRESS'],
  finished: ['RESOLVED', 'CLOSED', 'REJECTED'],
};

export type StatusGroup = 'all' | 'pending' | 'inProgress' | 'finished';

export function inGroup(status: string | null, group: StatusGroup) {
  if (group === 'all') return true;
  if (!status) return false;
  return groupStatuses[group].includes(status);
}

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysEndingAt(now: Date, length: number, offset = 0) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset - (length - 1) + index);
    return date;
  });
}

/** Registros por día durante `span` días y comparación con los `span` días anteriores. */
export function buildSeries(counts: IncidentSummary['byDay'], span: Span, now = new Date()) {
  const days: DayPoint[] = daysEndingAt(now, span).map((date) => ({
    key: localDay(date),
    weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
    day: String(date.getDate()),
    month: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
    count: counts[localDay(date)] ?? 0,
  }));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const previousTotal = daysEndingAt(now, span, span).reduce((sum, date) => sum + (counts[localDay(date)] ?? 0), 0);
  const delta = previousTotal === 0 ? null : Math.round(((total - previousTotal) / previousTotal) * 100);
  return { days, total, previousTotal, delta };
}

export function groupCount(summary: IncidentSummary, group: StatusGroup) {
  if (group === 'all') return summary.total;
  return groupStatuses[group].reduce((count, status) => count + (summary.byStatus[status] ?? 0), 0);
}

export function share(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 6 && hour < 13) return 'Buenos días';
  if (hour >= 13 && hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export function relativeTime(value: string | null, now = new Date()) {
  const date = parseDate(value);
  if (!date) return 'Sin fecha';
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}

import type { IncidentListItem } from '@/types/incidents';

export const SPANS = [7, 14, 30] as const;
export type Span = (typeof SPANS)[number];

export type DayPoint = { key: string; weekday: string; day: string; month: string; count: number };

const PENDING = ['REPORTED', 'REOPENED'];
const IN_PROGRESS = ['VALIDATED', 'ASSIGNED', 'IN_PROGRESS'];
const FINISHED = ['RESOLVED', 'CLOSED', 'REJECTED'];

export type StatusGroup = 'all' | 'pending' | 'inProgress' | 'finished';

export function inGroup(status: string | null, group: StatusGroup) {
  if (group === 'all') return true;
  if (!status) return false;
  return (group === 'pending' ? PENDING : group === 'inProgress' ? IN_PROGRESS : FINISHED).includes(status);
}

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
export function buildSeries(incidents: IncidentListItem[], span: Span, now = new Date()) {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    const date = parseDate(incident.registeredAt);
    if (date) counts.set(localDay(date), (counts.get(localDay(date)) ?? 0) + 1);
  }
  const days: DayPoint[] = daysEndingAt(now, span).map((date) => ({
    key: localDay(date),
    weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
    day: String(date.getDate()),
    month: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
    count: counts.get(localDay(date)) ?? 0,
  }));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const previousTotal = daysEndingAt(now, span, span).reduce((sum, date) => sum + (counts.get(localDay(date)) ?? 0), 0);
  const delta = previousTotal === 0 ? null : Math.round(((total - previousTotal) / previousTotal) * 100);
  return { days, total, previousTotal, delta };
}

export function summarize(incidents: IncidentListItem[]) {
  const withStatus = (statuses: string[]) => incidents.filter((item) => item.status && statuses.includes(item.status));
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const incident of incidents) {
    if (incident.status) byStatus.set(incident.status, (byStatus.get(incident.status) ?? 0) + 1);
    const category = incident.category ?? 'OTHER';
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }
  return {
    total: incidents.length,
    pending: withStatus(PENDING),
    inProgress: withStatus(IN_PROGRESS),
    finished: withStatus(FINISHED),
    byStatus,
    byCategory: [...byCategory].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
  };
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

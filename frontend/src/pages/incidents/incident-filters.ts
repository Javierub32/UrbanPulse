import type { IncidentListItem } from '@/types/incidents';

export const statuses: Record<string, string> = {
  REPORTED: 'Registrada', VALIDATED: 'Validada', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta', REOPENED: 'Reabierta', CLOSED: 'Cerrada', REJECTED: 'Rechazada',
};
export const activeStatuses = ['REPORTED', 'VALIDATED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
export const resolvedStatuses = ['RESOLVED', 'CLOSED'];
export type StatusGroup = 'all' | 'active' | 'resolved' | 'rejected';
export type Filters = { group: StatusGroup; category: string; period: 'all' | 'week' | 'month' | 'custom'; from: string; to: string };
export const initialFilters: Filters = { group: 'all', category: '', period: 'all', from: '', to: '' };
export const statusLabel = (status: string | null) => status ? statuses[status] ?? status : 'Estado no disponible';
export function statusGroup(status: string | null): StatusGroup | null {
  if (status && activeStatuses.includes(status)) return 'active';
  if (status && resolvedStatuses.includes(status)) return 'resolved';
  return status === 'REJECTED' ? 'rejected' : null;
}
export function ticketStatusTone(status: string | null): 'reported' | 'progress' | 'resolved' | 'rejected' | 'unknown' {
  if (status === 'REPORTED') return 'reported';
  const group = statusGroup(status);
  if (group === 'active') return 'progress';
  if (group === 'resolved') return 'resolved';
  if (group === 'rejected') return 'rejected';
  return 'unknown';
}
export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
export function dateBounds(filters: Filters, now = Date.now()): { since: string | null; until: string | null; valid: boolean } {
  if (filters.period === 'all') return { since: null, until: null, valid: true };
  if (filters.period !== 'custom') return { since: new Date(now - (filters.period === 'week' ? 7 : 30) * 86400000).toISOString(), until: null, valid: true };
  const start = parseLocalDay(filters.from);
  const end = filters.to ? parseLocalDay(filters.to) : start;
  if (!start || !end || end < start) return { since: null, until: null, valid: false };
  const exclusiveEnd = new Date(end);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  return { since: start.toISOString(), until: exclusiveEnd.toISOString(), valid: true };
}
export function matchesFilters(item: IncidentListItem, filters: Filters, since: string | null, until: string | null = null) {
  const date = parseDate(item.registeredAt);
  return (filters.group === 'all' || statusGroup(item.status) === filters.group)
    && (!filters.category || item.category === filters.category)
    && (!since || (!!date && date.getTime() >= new Date(since).getTime()))
    && (!until || (!!date && date.getTime() < new Date(until).getTime()));
}

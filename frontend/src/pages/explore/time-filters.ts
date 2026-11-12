export const timeFilters = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'month', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todos' },
] as const;
export type TimeFilter = (typeof timeFilters)[number]['value'];

export function startOfPeriod(period: TimeFilter, current = new Date()): string | null {
  if (period === 'all') return null;
  if (period === 'today') {
    const start = new Date(current);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  return new Date(current.getTime() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();
}

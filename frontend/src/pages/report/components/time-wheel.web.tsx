import { useLayoutEffect, useRef } from 'react';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: Date; onChange: (value: Date) => void; disabled?: boolean };
type ColumnProps = { label: string; value: number; count: number; disabled?: boolean; onChange: (value: number) => void };
const ITEM_HEIGHT = 44;

function WheelColumn({ label, value, count, disabled, onChange }: ColumnProps) {
  const list = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const theme = useTheme();
  useLayoutEffect(() => {
    if (!list.current) return;
    list.current.scrollTop = (count + value) * ITEM_HEIGHT;
    initialized.current = true;
    // The initial offset is set once; user scrolling drives subsequent values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(number: number) {
    const next = (number + count) % count;
    const currentIndex = Math.round((list.current?.scrollTop ?? count * ITEM_HEIGHT) / ITEM_HEIGHT);
    const target = [next, count + next, 2 * count + next].reduce((closest, candidate) =>
      Math.abs(candidate - currentIndex) < Math.abs(closest - currentIndex) ? candidate : closest);
    onChange(next);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.current?.scrollTo({ top: target * ITEM_HEIGHT, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
  return <div className="time-wheel-column" ref={list} role="spinbutton" aria-label={label} aria-valuemin={0} aria-valuemax={count - 1} aria-valuenow={value} aria-valuetext={String(value).padStart(2, '0')} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
    onScroll={event => { if (!initialized.current || disabled) return; const index = Math.round(event.currentTarget.scrollTop / ITEM_HEIGHT); const next = index % count; if (next !== value) onChange(next); if (index < count / 2 || index >= count * 2.5) event.currentTarget.scrollTop = (count + next) * ITEM_HEIGHT; }}
    onKeyDown={event => { if (disabled) return; if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); select(value + (event.key === 'ArrowDown' ? 1 : -1)); } }}>
    {Array.from({ length: count * 3 }, (_, index) => { const number = index % count; const distance = Math.min(Math.abs(number - value), count - Math.abs(number - value)); return <button key={index} type="button" tabIndex={-1} aria-hidden="true" disabled={disabled} className="time-wheel-item" style={{ color: theme.ink, opacity: distance === 0 ? 1 : distance === 1 ? 0.52 : 0.25, fontWeight: number === value ? 600 : 400 }} onClick={() => select(number)}>{String(number).padStart(2, '0')}</button>; })}
  </div>;
}

export function TimeWheel({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const changeTime = (part: 'hours' | 'minutes', number: number) => {
    const next = new Date(value);
    if (part === 'hours') next.setHours(number); else next.setMinutes(number);
    next.setSeconds(0, 0);
    onChange(next);
  };
  return <div className="time-wheel" style={{ backgroundColor: theme.surface }}>
    <div aria-hidden="true" className="time-wheel-highlight" style={{ backgroundColor: theme.backgroundElement }} />
    <WheelColumn label="Horas" value={value.getHours()} count={24} disabled={disabled} onChange={number => changeTime('hours', number)} />
    <WheelColumn label="Minutos" value={value.getMinutes()} count={60} disabled={disabled} onChange={number => changeTime('minutes', number)} />
  </div>;
}

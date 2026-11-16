import { createElement } from 'react';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IncidentDateTimePickerProps = {
  value: Date;
  onChange: (value: Date) => void;
  disabled?: boolean;
};

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalTime(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function IncidentDateTimePicker({ value, onChange, disabled }: IncidentDateTimePickerProps) {
  const theme = useTheme();
  const inputStyle = {
      boxSizing: 'border-box',
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      padding: Spacing.three,
      border: 0,
      borderRadius: 12,
      backgroundColor: theme.backgroundElement,
      color: theme.text,
      font: 'inherit',
      cursor: disabled ? 'default' : 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      opacity: disabled ? 0.5 : 1,
  };
  return createElement('div', {
    style: { display: 'flex', gap: Spacing.two },
  },
  createElement('input', {
    type: 'date',
    'aria-label': 'Fecha de la incidencia',
    value: formatLocalDate(value),
    disabled,
    onClick: (event: { currentTarget: { showPicker?: () => void } }) => event.currentTarget.showPicker?.(),
    onChange: (event: { currentTarget: { value: string } }) => {
      const [year, month, day] = event.currentTarget.value.split('-').map(Number);
      if (year && month && day) {
        const selected = new Date(value);
        selected.setFullYear(year, month - 1, day);
        onChange(selected);
      }
    },
    style: inputStyle,
  }),
  createElement('input', {
    type: 'time',
    'aria-label': 'Hora de la incidencia',
    value: formatLocalTime(value),
    disabled,
    onClick: (event: { currentTarget: { showPicker?: () => void } }) => event.currentTarget.showPicker?.(),
    onChange: (event: { currentTarget: { value: string } }) => {
      const [hours, minutes] = event.currentTarget.value.split(':').map(Number);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const selected = new Date(value);
        selected.setHours(hours, minutes, 0, 0);
        onChange(selected);
      }
    },
    style: inputStyle,
  }));
}

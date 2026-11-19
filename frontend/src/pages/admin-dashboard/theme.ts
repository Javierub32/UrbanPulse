import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#EDF3F2',
    surface: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.88)',
    text: '#142B30',
    muted: '#52686D',
    border: '#DCE7E5',
    track: 'rgba(20, 43, 48, 0.08)',
    accent: '#126F68',
    accentSoft: '#DDF0EA',
    danger: '#B63A3D',
    warning: '#A6650B',
    success: '#1A8062',
  },
  dark: {
    background: '#101D22',
    surface: '#1B2B31',
    glass: 'rgba(28, 45, 51, 0.84)',
    glassBorder: 'rgba(153, 194, 190, 0.20)',
    text: '#F3F8F7',
    muted: '#B4C7C7',
    border: '#385158',
    track: 'rgba(255, 255, 255, 0.10)',
    accent: '#83D9C2',
    accentSoft: '#24443F',
    danger: '#FF8589',
    warning: '#E9B55D',
    success: '#75D4A9',
  },
} as const;

export function useAdminTheme() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

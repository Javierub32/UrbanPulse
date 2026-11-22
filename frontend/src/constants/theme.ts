/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#117D73',
    accentText: '#FFFFFF',
    error: '#B42318',
    border: '#C7CBCC',
    accentSurface: '#117D73',
    accentContrast: '#FFFFFF',
    ticketPaper: '#F8F7F3', ticketInk: '#202020', ticketMuted: '#606060', ticketLine: '#B3B3B3',
    canvas: '#FFFFFF', surface: '#FFFFFF', ink: '#142B30', muted: '#52686D', line: '#DCE7E5',
    glass: 'rgba(237, 250, 244, 0.68)', glassEdge: 'rgba(255, 255, 255, 0.88)', glassSelected: 'rgba(255, 255, 255, 0.64)', glassWarm: 'rgba(251, 242, 220, 0.74)', glassSuccess: 'rgba(222, 244, 232, 0.76)', grid: 'rgba(102, 102, 102, 0.16)',
    warning: '#8B5A0C', warningSurface: '#FBF2DC', success: '#176C52', successSurface: '#E3F3EA', danger: '#A83238', dangerSurface: '#FCE9E8', softAccent: '#DDF0EA',
    filterGlass: 'rgba(225, 246, 237, 0.42)', filterGlassActive: 'rgba(9, 100, 85, 0.9)', filterGlassClear: 'rgba(255, 255, 255, 0.14)',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#66D9C9',
    accentText: '#102A27',
    error: '#FFB4AB',
    border: '#50585B',
    accentSurface: '#168F84',
    accentContrast: '#FFFFFF',
    ticketPaper: '#F8F7F3', ticketInk: '#202020', ticketMuted: '#606060', ticketLine: '#B3B3B3',
    canvas: '#101D22', surface: '#1B2B31', ink: '#F3F8F7', muted: '#B4C7C7', line: '#385158',
    glass: 'rgba(28, 45, 51, 0.78)', glassEdge: 'rgba(163, 208, 198, 0.26)', glassSelected: 'rgba(131, 217, 194, 0.15)', glassWarm: 'rgba(62, 50, 32, 0.88)', glassSuccess: 'rgba(32, 62, 51, 0.88)', grid: 'rgba(212, 230, 225, 0.07)',
    warning: '#E9B55D', warningSurface: '#3E3220', success: '#75D4A9', successSurface: '#203E33', danger: '#FF999D', dangerSurface: '#4C292D', softAccent: '#24443F',
    filterGlass: 'rgba(28, 45, 51, 0.76)', filterGlassActive: 'rgba(16, 105, 96, 0.9)', filterGlassClear: 'rgba(28, 45, 51, 0.32)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const FormLayout = {
  maxWidth: 480,
  controlHeight: 48,
  radius: 12,
} as const;

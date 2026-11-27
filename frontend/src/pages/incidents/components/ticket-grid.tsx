import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

export function TicketGrid() {
  const theme = useTheme();
  const id = 'ticket-grid-' + useId().replace(/[^\w-]/g, '');

  return <Svg pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs><Pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
      <Path d="M 24 0 L 0 0 0 24" fill="none" stroke={theme.grid} strokeWidth="1" />
    </Pattern></Defs>
    <Rect width="100%" height="100%" fill={theme.canvas} />
    <Rect width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>;
}

import '@/pages/admin-dashboard/operator.css';

import { ThemeProvider, useTheme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { AdminWorkspace } from '@/pages/admin-dashboard/admin-shell';

export default function OperatorLayout() {
  const theme = useTheme();
  return (
    <AdminWorkspace>
      <ThemeProvider value={{ ...theme, colors: { ...theme.colors, background: 'transparent' } }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(panel)" />
          <Stack.Screen name="incident/[id]" options={{ animation: 'none', title: 'Detalle de incidencia' }} />
        </Stack>
      </ThemeProvider>
    </AdminWorkspace>
  );
}

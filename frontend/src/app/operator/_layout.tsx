import '@/pages/admin-dashboard/operator.css';

import { Stack } from 'expo-router/stack';

export default function OperatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(panel)" />
      <Stack.Screen name="incident/[id]" options={{ title: 'Detalle de incidencia' }} />
    </Stack>
  );
}

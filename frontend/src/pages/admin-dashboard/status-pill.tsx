import { Text, View } from 'react-native';

import { incidentStatus, incidentStatusTone } from './incident-status';
import { useAdminTheme } from './theme';

/** Estado con punto de color y nombre: el color nunca va solo. */
export function StatusPill({ status }: { status: string | null }) {
  const theme = useAdminTheme();
  const color = theme[incidentStatusTone(status)];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: `${color}1F` }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text numberOfLines={1} style={{ color, fontSize: 12, fontWeight: '700' }}>{incidentStatus(status)}</Text>
    </View>
  );
}

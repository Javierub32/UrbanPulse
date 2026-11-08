import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function IncidentsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Incidencias</ThemedText>
      <ThemedText style={styles.description} themeColor="textSecondary">
        Aquí podrás consultar el estado y el historial de tus avisos.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  description: {
    maxWidth: 360,
    textAlign: 'center',
  },
});

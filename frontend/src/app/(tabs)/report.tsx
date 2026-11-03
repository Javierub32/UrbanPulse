import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ReportScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Reportar una incidencia</ThemedText>
      <ThemedText style={styles.description} themeColor="textSecondary">
        Aquí estará el formulario para comunicar un problema urbano.
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

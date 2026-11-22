import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useAdminTheme } from './theme';

export function AdminLogoutButton({ placement = 'profile', compact = false }: { placement?: 'profile' | 'sidebar'; compact?: boolean }) {
  const { signOut } = useAuth();
  const theme = useAdminTheme();
  const colors = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sidebar = placement === 'sidebar';
  const foreground = sidebar ? colors.danger : theme.background;

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signOut();
    } catch {
      setError('No se ha podido cerrar la sesión. Vuelve a intentarlo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flexShrink: 0, gap: 8, marginTop: sidebar ? 8 : 0 }}>
      {error ? <Text accessibilityRole="alert" accessibilityLabel={error} style={{ color: theme.danger, textAlign: compact ? 'center' : undefined, fontSize: compact ? 10 : undefined }}>{compact ? 'Error de cierre' : error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={() => void logout()}
        style={({ pressed }) => ({
          alignSelf: sidebar ? 'stretch' : 'flex-start',
          minHeight: 48,
          minWidth: sidebar ? undefined : 150,
          paddingHorizontal: compact ? 0 : sidebar ? 16 : 18,
          alignItems: 'center',
          justifyContent: sidebar && !compact ? 'flex-start' : 'center',
          flexDirection: 'row',
          gap: 12,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: sidebar ? 'transparent' : theme.accent,
          opacity: busy || pressed ? 0.7 : 1,
        })}
      >
        {sidebar && (
          <GlassSurface
            pointerEvents="none"
            aria-hidden
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${colors.danger}33`,
                backgroundColor: `${colors.dangerSurface}99`,
              },
            ]}
          />
        )}
        {busy ? <ActivityIndicator color={sidebar ? foreground : theme.surface} /> : (
          <>
            {sidebar && (
              <View aria-hidden>
                <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={foreground} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2M9 12h11m-4-4 4 4-4 4" />
                </Svg>
              </View>
            )}
            {!compact && <Text style={{ color: foreground, fontSize: sidebar ? 15 : 14, fontWeight: '700' }}>Cerrar sesión</Text>}
          </>
        )}
      </Pressable>
    </View>
  );
}

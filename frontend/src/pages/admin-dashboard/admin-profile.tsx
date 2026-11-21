import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { AdminLogoutButton } from './admin-logout-button';
import { Reveal } from './motion';
import { useAdminTheme } from './theme';

export default function AdminProfileScreen() {
  const theme = useAdminTheme();
  const { user } = useAuth();

  if (!user) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ padding: 42, paddingTop: 38, gap: 24 }}>
      <Reveal index={0}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 }}>Tu perfil</Text>
          <Text style={{ color: theme.muted, fontSize: 15 }}>Datos de tu sesión de operador.</Text>
        </View>
      </Reveal>
      <Reveal index={1} style={{ maxWidth: 640 }}>
      <View nativeID="admin-card-profile" style={{ backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', padding: 28, gap: 22 }}>
        <View style={{ gap: 5 }}><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Nombre</Text><Text selectable style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{user.name}</Text></View>
        <View style={{ gap: 5 }}><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Correo electrónico</Text><Text selectable style={{ color: theme.text, fontSize: 16 }}>{user.email}</Text></View>
        <View style={{ gap: 5 }}><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Rol</Text><Text style={{ color: theme.text, fontSize: 16 }}>Operador</Text></View>
        <AdminLogoutButton />
      </View>
      </Reveal>
    </ScrollView>
  );
}

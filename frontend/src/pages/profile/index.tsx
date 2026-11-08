import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthButton, AuthError } from "@/components/auth-form";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { BottomTabInset, FormLayout, Spacing } from "@/constants/theme";
import type { UserRole } from "@/types/auth";

const roles: Record<UserRole, string> = {
  CITIZEN: "Ciudadano",
  OPERATOR: "Operador",
  TECHNICIAN: "Técnico",
  ADMINISTRATOR: "Administrador",
  ANALYST: "Analista",
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut();
    } catch {
      setError("No se ha podido cerrar la sesión. Vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: Spacing.four,
        paddingTop: insets.top + Spacing.four,
        paddingBottom: BottomTabInset + Spacing.four,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: FormLayout.maxWidth,
          alignSelf: "center",
          gap: Spacing.four,
        }}
      >
        <ThemedText type="subtitle">Tu perfil</ThemedText>
        <ThemedText selectable>{user.name}</ThemedText>
        <ThemedText selectable themeColor="textSecondary">
          {user.email}
        </ThemedText>
        <ThemedText>{roles[user.role]}</ThemedText>
        {!!error && <AuthError message={error} />}
        <AuthButton
          title="Cerrar sesión"
          loading={loading}
          onPress={() => void handleLogout()}
        />
      </View>
    </ScrollView>
  );
}

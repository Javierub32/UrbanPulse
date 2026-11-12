import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthScreen,
} from "@/components/auth-form";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api-client";
import { useTheme } from "@/hooks/use-theme";

export default function LoginScreen() {
  const { email: initialEmail, registered } = useLocalSearchParams<{
    email?: string;
    registered?: string;
  }>();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const { signIn } = useAuth();
  const colors = useTheme();

  async function handleLogin() {
    if (loading) return;
    setError("");
    setFields({});
    if (!email.trim() || !password.trim()) {
      setFields({
        ...(!email.trim() && { email: "Escribe tu correo." }),
        ...(!password.trim() && { password: "Escribe tu contraseña." }),
      });
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido iniciar sesión.",
      );
      if (error instanceof ApiError) setFields(error.fields);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <ThemedText type="subtitle">Bienvenido a UrbanPulse</ThemedText>
      <ThemedText themeColor="textSecondary">
        Accede para comunicar y seguir las incidencias de tu ciudad.
      </ThemedText>
      {registered === "1" && (
        <ThemedText selectable style={{ color: colors.accent }}>
          Tu cuenta ya está creada. Ahora puedes iniciar sesión.
        </ThemedText>
      )}
      <AuthField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCorrect={false}
        editable={!loading}
        error={fields.email}
      />
      <AuthField
        label="Contraseña"
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        editable={!loading}
        error={fields.password}
        returnKeyType="go"
        onSubmitEditing={() => void handleLogin()}
      />
      {!!error && <AuthError message={error} />}
      <AuthButton
        title="Iniciar sesión"
        loading={loading}
        onPress={() => void handleLogin()}
      />
      <ThemedText themeColor="textSecondary">
        ¿Todavía no tienes cuenta?
      </ThemedText>
      <Link href="/(auth)/register" style={{ color: colors.accent }}>
        Crear una cuenta
      </Link>
    </AuthScreen>
  );
}

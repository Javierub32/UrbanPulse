import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthScreen,
} from "@/components/auth-form";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api-client";
import { validateRegistration } from "@/services/session";
import { useTheme } from "@/hooks/use-theme";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const { signUp } = useAuth();
  const router = useRouter();
  const colors = useTheme();

  async function handleRegister() {
    if (loading) return;
    setError("");
    const invalid = validateRegistration(name, email, password, confirmation);
    setFields(invalid);
    if (Object.keys(invalid).length) return;
    setLoading(true);
    try {
      await signUp({ name, email, password });
      router.replace({
        pathname: "/(auth)/login",
        params: { registered: "1", email: email.trim() },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido crear la cuenta.",
      );
      if (error instanceof ApiError) setFields(error.fields);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <ThemedText type="subtitle">Crea tu cuenta</ThemedText>
      <ThemedText themeColor="textSecondary">
        Regístrate para comunicar incidencias y consultar su seguimiento.
      </ThemedText>
      <AuthField
        label="Nombre"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        editable={!loading}
        error={fields.name}
      />
      <AuthField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!loading}
        error={fields.email}
      />
      <AuthField
        label="Contraseña"
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!loading}
        error={fields.password}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Al menos 8 caracteres. Los espacios forman parte de la contraseña.
      </ThemedText>
      <AuthField
        label="Repite la contraseña"
        password
        value={confirmation}
        onChangeText={setConfirmation}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!loading}
        error={fields.confirmation}
        returnKeyType="go"
        onSubmitEditing={() => void handleRegister()}
      />
      {!!error && <AuthError message={error} />}
      <AuthButton
        title="Crear cuenta"
        loading={loading}
        onPress={() => void handleRegister()}
      />
      <Link href="/(auth)/login" replace style={{ color: colors.accent }}>
        Ya tengo cuenta. Iniciar sesión
      </Link>
    </AuthScreen>
  );
}

import "../../global.css";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthButton, AuthError, AuthScreen } from "@/components/auth-form";
import { useTheme } from "@/hooks/use-theme";

void SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, loading, restoreError, restoreSession, signOut } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const colors = useTheme();
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Comprobando sesión" />
      </View>
    );
  if (restoreError)
    return (
      <AuthScreen>
        <AuthError message={restoreError} />
        {!!logoutError && <AuthError message={logoutError} />}
        <AuthButton title="Reintentar" onPress={() => void restoreSession()} />
        <AuthButton
          title="Ir al login"
          onPress={() =>
            void signOut().catch(() =>
              setLogoutError(
                "No se ha podido borrar la sesión. Vuelve a intentarlo.",
              ),
            )
          }
        />
      </AuthScreen>
    );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

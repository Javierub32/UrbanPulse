import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import type { AuthSession, RegisterRequest } from "@/types/auth";
import * as authService from "@/services/auth-service";
import * as storage from "@/services/token-storage";
import { ApiError, setApiSession } from "@/services/api-client";
import { createSessionWriter, readStoredSession } from "@/services/session";

type AuthContextType = {
  session: AuthSession | null;
  loading: boolean;
  restoreError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const version = useRef(0);
  const currentToken = useRef<string | null>(null);
  const [writeSession] = useState(() => createSessionWriter((value) =>
    value === null ? storage.removeSession() : storage.saveSession(value),
  ));

  const expireSession = useCallback(() => {
    const requestVersion = ++version.current;
    currentToken.current = null;
    setApiSession(null);
    setSession(null);
    setLoading(false);
    setRestoreError(null);
    void writeSession(null, () => requestVersion === version.current).catch(() => {
      if (requestVersion === version.current)
        setRestoreError("No se ha podido borrar la sesión guardada. Vuelve a intentarlo.");
    });
  }, [writeSession]);

  const restoreSession = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const saved = readStoredSession(await storage.getSession());
      if (requestVersion !== version.current) return;
      setLoading(true);
      setRestoreError(null);
      if (!saved) {
        await writeSession(null, () => requestVersion === version.current);
        if (requestVersion === version.current) {
          currentToken.current = null;
          setApiSession(null);
          setSession(null);
        }
        return;
      }
      setApiSession(saved.accessToken, expireSession);
      const user = await authService.getCurrentUser();
      if (requestVersion === version.current) {
        if (saved.expiresAt <= Date.now()) {
          expireSession();
          return;
        }
        currentToken.current = saved.accessToken;
        setSession({
          ...saved,
          tokenType: "Bearer",
          expiresIn: Math.max(0, (saved.expiresAt - Date.now()) / 1000),
          user,
        });
      }
    } catch (error) {
      if (requestVersion === version.current) {
        if (error instanceof ApiError && error.status === 401) expireSession();
        else
          setRestoreError(
            error instanceof ApiError ? error.message : "No se ha podido leer o borrar la sesión guardada. Vuelve a intentarlo.",
          );
      }
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }, [expireSession, writeSession]);

  useEffect(() => {
    const lifecycle = version;
    // Sincroniza el proveedor con la sesión guardada al arrancar la app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restoreSession();
    return () => {
      lifecycle.current++;
      setApiSession(null);
    };
  }, [restoreSession]);

  useEffect(() => {
    if (!session) return;
    const expireIfNeeded = () => {
      if (currentToken.current === session.accessToken && Date.now() >= session.expiresAt) expireSession();
    };
    const timer = setTimeout(
      expireIfNeeded,
      Math.min(Math.max(session.expiresAt - Date.now(), 0), 2147483647),
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") expireIfNeeded();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session, expireSession]);

  async function signIn(email: string, password: string) {
    const requestVersion = ++version.current;
    try {
      await writeSession(null, () => requestVersion === version.current);
    } catch {
      if (requestVersion === version.current)
        throw new Error("No se ha podido preparar la sesión en este dispositivo. Vuelve a intentarlo.");
      return;
    }
    if (requestVersion !== version.current) return;
    const response = await authService.signIn(email, password);
    if (requestVersion !== version.current) return;
    const expiresAt = Date.now() + response.expiresIn * 1000;
    try {
      await writeSession(JSON.stringify({ accessToken: response.accessToken, expiresAt }),
        () => requestVersion === version.current);
    } catch {
      if (requestVersion === version.current)
        throw new Error("No se ha podido guardar la sesión en este dispositivo. Vuelve a intentarlo.");
      return;
    }
    if (requestVersion !== version.current) return;
    currentToken.current = response.accessToken;
    setApiSession(response.accessToken, expireSession);
    setRestoreError(null);
    setSession({ ...response, expiresAt });
  }

  async function signUp(data: RegisterRequest) {
    await authService.signUp(data);
  }

  async function signOut() {
    const requestVersion = ++version.current;
    currentToken.current = null;
    setApiSession(null);
    setSession(null);
    setRestoreError(null);
    setLoading(true);
    try {
      await writeSession(null, () => requestVersion === version.current);
    } catch {
      if (requestVersion === version.current)
        setRestoreError("No se ha podido borrar la sesión guardada. Vuelve a intentarlo.");
      throw new Error("No se ha podido borrar la sesión guardada.");
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        restoreError,
        signIn,
        signUp,
        signOut,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return { ...auth, user: auth.session?.user ?? null };
}

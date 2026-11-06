const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");
let accessToken: string | null = null;
let onUnauthorized: (() => void) | undefined;
let sessionVersion = 0;
const pending = new Set<AbortController>();

export class ApiError extends Error {
  public status: number;
  public fields: Record<string, string>;
  constructor(
    status: number,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function setApiSession(token: string | null, expired?: () => void) {
  if (token !== accessToken) {
    sessionVersion++;
    pending.forEach((controller) => controller.abort());
    pending.clear();
  }
  accessToken = token;
  onUnauthorized = expired;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const token = authenticated ? accessToken : null;
  const requestVersion = sessionVersion;
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  if (token) pending.add(controller);
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = new Headers(options.headers);
  headers.delete("Authorization");
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: "omit",
    });
    const body = await response.json().catch(() => null);
    if (token && requestVersion !== sessionVersion)
      throw new ApiError(0, "La sesión ha cambiado. Vuelve a intentarlo.");
    if (!response.ok) {
      if (response.status === 401 && token && token === accessToken)
        onUnauthorized?.();
      const fields: Record<string, string> = {};
      if (Array.isArray(body?.errors)) {
        for (const error of body.errors) {
          if (
            typeof error.field === "string" &&
            typeof error.message === "string"
          )
            fields[error.field] = error.message;
        }
      }
      throw new ApiError(
        response.status,
        body?.detail ||
          body?.message ||
          "No se ha podido completar la petición.",
        fields,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      controller.signal.aborted
        ? "La petición se ha interrumpido. Vuelve a intentarlo."
        : "No se ha podido conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.",
    );
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
    pending.delete(controller);
  }
}

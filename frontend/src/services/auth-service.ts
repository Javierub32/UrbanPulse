import type { AuthResponse, AuthUser, RegisterRequest } from "@/types/auth";
import { apiRequest } from "./api-client";

export function signIn(email: string, password: string) {
  return apiRequest<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    },
    false,
  );
}

export function signUp(data: RegisterRequest) {
  return apiRequest<AuthUser>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        name: data.name.trim(),
        email: data.email.trim(),
      }),
    },
    false,
  );
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/api/auth/me");
}

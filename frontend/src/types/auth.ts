export type UserRole =
  "CITIZEN" | "OPERATOR" | "TECHNICIAN" | "ADMINISTRATOR" | "ANALYST";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
export type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};
export type AuthSession = AuthResponse & { expiresAt: number };
export type StoredSession = { accessToken: string; expiresAt: number };
export type RegisterRequest = { name: string; email: string; password: string };

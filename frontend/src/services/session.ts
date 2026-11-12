import type { StoredSession } from "../types/auth";

export function createSessionWriter(write: (value: string | null) => Promise<void>) {
  let pending = Promise.resolve();
  return (value: string | null, isCurrent: () => boolean) => {
    const update = pending.then(async () => {
      if (isCurrent()) await write(value);
    });
    pending = update.catch(() => {});
    return update;
  };
}

export function readStoredSession(value: string | null): StoredSession | null {
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (
      typeof session.accessToken !== "string" ||
      !session.accessToken ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    )
      return null;
    return { accessToken: session.accessToken, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export function passwordBytes(password: string) {
  return Array.from(password).reduce((total, character) => {
    const code = character.codePointAt(0)!;
    return (
      total + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4)
    );
  }, 0);
}

export function validateRegistration(
  name: string,
  email: string,
  password: string,
  confirmation: string,
) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "Escribe tu nombre.";
  else if (name.trim().length > 100)
    errors.name = "El nombre no puede superar 100 caracteres.";
  if (!email.trim() || !/^[^\s@]+@[^\s@]+$/.test(email.trim()))
    errors.email = "Escribe un correo válido.";
  else if (email.trim().length > 254)
    errors.email = "El correo es demasiado largo.";
  if (!password.trim() || Array.from(password).length < 8)
    errors.password = "Utiliza al menos 8 caracteres.";
  else if (passwordBytes(password) > 72)
    errors.password =
      "La contraseña es demasiado larga. Los acentos y emojis ocupan más espacio.";
  if (password !== confirmation)
    errors.confirmation = "Las contraseñas no coinciden.";
  return errors;
}

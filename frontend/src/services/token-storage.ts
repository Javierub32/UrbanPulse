const key = "urbanpulse.session";

export async function getSession() {
  return typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(key);
}

export async function saveSession(value: string) {
  window.sessionStorage.setItem(key, value);
}

export async function removeSession() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(key);
}

import * as SecureStore from "expo-secure-store";

const key = "urbanpulse.session";

export function getSession() {
  return SecureStore.getItemAsync(key);
}
export function saveSession(value: string) {
  return SecureStore.setItemAsync(key, value);
}
export function removeSession() {
  return SecureStore.deleteItemAsync(key);
}

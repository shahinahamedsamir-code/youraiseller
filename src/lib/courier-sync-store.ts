import { sellerStorageKey } from "./seller-storage";

const KEY_SUFFIX = "courier-auto-sync";

export function isCourierAutoSyncEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const key = sellerStorageKey(KEY_SUFFIX);
  if (!key) return true;
  const v = localStorage.getItem(key);
  if (v === null) return true;
  return v === "1" || v === "true";
}

export function setCourierAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  const key = sellerStorageKey(KEY_SUFFIX);
  if (!key) return;
  localStorage.setItem(key, enabled ? "1" : "0");
  window.dispatchEvent(new Event("youraiseller-courier-sync-settings"));
}

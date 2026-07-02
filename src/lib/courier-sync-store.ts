import { sellerStorageKey } from "./seller-storage";

const KEY_SUFFIX = "courier-auto-sync";

/**
 * Master switch — background courier status auto-sync is OFF for everyone. The
 * CourierAutoSyncRunner no longer polls couriers to change order statuses on its
 * own. Manual "Refresh status" from an order still works (and still respects the
 * selective / settled-status rules in applyCourierDeliveryStatus). Flip to true
 * to re-enable the per-seller auto-sync setting below.
 */
const COURIER_AUTO_SYNC_MASTER_ENABLED = false;

export function isCourierAutoSyncEnabled(): boolean {
  if (!COURIER_AUTO_SYNC_MASTER_ENABLED) return false;
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

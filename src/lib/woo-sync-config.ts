/**
 * WooCommerce → panel order status sync.
 * Off for now: panel Web status is staff-only until Woo mapping is ready.
 */
export const WOO_ORDER_STATUS_SYNC_ENABLED = false;

export function isWooOrderStatusSyncEnabled(): boolean {
  return WOO_ORDER_STATUS_SYNC_ENABLED;
}

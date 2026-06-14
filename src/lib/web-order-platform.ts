import type { Order } from "./orders-store";

export type WebStorePlatform = "shopify" | "woocommerce";

export function isShopifyWebOrder(order: Pick<Order, "tags">): boolean {
  return order.tags?.some((tag) => tag.trim().toLowerCase() === "shopify") ?? false;
}

export function isWooCommerceWebOrder(
  order: Pick<Order, "tags" | "wooOrderId" | "wooSnapshot">
): boolean {
  if (isShopifyWebOrder(order)) return false;
  return (
    order.wooOrderId != null ||
    (order.tags?.some((tag) => tag === "WooCommerce") ?? false) ||
    Boolean(order.wooSnapshot)
  );
}

export function getWebStorePlatform(
  order: Pick<Order, "tags" | "wooOrderId" | "wooSnapshot">
): WebStorePlatform | null {
  if (isShopifyWebOrder(order)) return "shopify";
  if (isWooCommerceWebOrder(order)) return "woocommerce";
  return null;
}

export function getWebStorePlatformLabel(
  order: Pick<Order, "tags" | "wooOrderId" | "wooSnapshot">
): string {
  const platform = getWebStorePlatform(order);
  if (platform === "shopify") return "Shopify";
  if (platform === "woocommerce") return "WooCommerce";
  return "Web store";
}

import type { DeliveryMethod } from "./delivery-methods-store";

export function courierSupportsApiEntry(method: DeliveryMethod): boolean {
  if (method.type === "steadfast") {
    return !!(
      method.steadfast?.apiKey?.trim() && method.steadfast?.apiSecret?.trim()
    );
  }
  if (method.type === "pathao") {
    const p = method.pathao;
    return !!(
      p?.clientId?.trim() &&
      p?.clientSecret?.trim() &&
      p?.username?.trim() &&
      p?.password &&
      p?.storeId > 0
    );
  }
  if (method.type === "carrybee") {
    const c = method.carrybee;
    return !!(
      c?.clientId?.trim() &&
      c?.clientSecret?.trim() &&
      c?.clientContext?.trim() &&
      c?.storeId?.trim()
    );
  }
  return false;
}

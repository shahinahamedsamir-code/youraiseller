import type { DeliveryMethodType } from "./delivery-methods-store";
import type { OrderStatus } from "./orders-store";
import { mapCarrybeeStatusToOrderStatus } from "./carrybee-status-map";
import { mapPathaoOrderStatusToOrderStatus } from "./pathao-status-map";
import { mapSteadfastDeliveryStatusToOrderStatus } from "./steadfast-status-map";

export function mapCourierStatusToOrderStatus(
  courierType: DeliveryMethodType,
  status: string
): OrderStatus | null {
  if (courierType === "steadfast") {
    return mapSteadfastDeliveryStatusToOrderStatus(status);
  }
  if (courierType === "pathao") {
    return mapPathaoOrderStatusToOrderStatus(status);
  }
  if (courierType === "carrybee") {
    return mapCarrybeeStatusToOrderStatus(status);
  }
  return null;
}

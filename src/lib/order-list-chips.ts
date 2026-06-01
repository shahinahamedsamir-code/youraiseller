import {
  loadDeliveryMethods,
  type DeliveryMethod,
} from "./delivery-methods-store";

export type OrderListChip = {
  id: string;
  label: string;
  deliveryMethodId?: string;
};

/** Build order-list filter pills — only active delivery methods (inactive hidden). */
export function buildOrderListChips(methods?: DeliveryMethod[]): OrderListChip[] {
  const list = (methods ?? loadDeliveryMethods()).filter((m) => m.active);
  return [
    { id: "all", label: "All" },
    ...list.map((m) => ({
      id: m.id,
      label: m.name.toUpperCase(),
      deliveryMethodId: m.id,
    })),
  ];
}

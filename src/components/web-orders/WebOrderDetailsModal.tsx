"use client";

import { OrderDetailsModal } from "@/components/orders/OrderDetailsModal";

type Props = {
  orderId: string;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
};

export function WebOrderDetailsModal({
  orderId,
  onClose,
  onEdit,
  onRefresh,
}: Props) {
  return (
    <OrderDetailsModal
      orderId={orderId}
      variant="web"
      onClose={onClose}
      onEdit={onEdit}
      onRefresh={onRefresh}
    />
  );
}

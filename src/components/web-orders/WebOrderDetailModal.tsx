"use client";

import { OrderEditModal } from "@/components/orders/OrderEditModal";

type Props = {
  orderId: string;
  onClose: () => void;
  onSaved: () => void;
};

const WEB_OPEN_ENTRY = "Web Order List · Open";

export function WebOrderDetailModal(props: Props) {
  return (
    <OrderEditModal
      variant="web"
      entryPoint={WEB_OPEN_ENTRY}
      logOnOpen
      showActivityLog
      {...props}
    />
  );
}

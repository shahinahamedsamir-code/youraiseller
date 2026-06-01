"use client";

import { WebOrderEditForm } from "@/components/web-orders/WebOrderEditForm";

type Props = {
  orderId: string;
};

export function WebOrderEditPage({ orderId }: Props) {
  return <WebOrderEditForm orderId={orderId} />;
}

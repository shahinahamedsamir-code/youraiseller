import clsx from "clsx";
import type { OrderStatus } from "@/lib/orders-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";

const styles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  rts: "bg-teal-100 text-teal-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  pending_return: "bg-orange-100 text-orange-800",
  returned: "bg-rose-100 text-rose-800",
  partial: "bg-blue-100 text-blue-800",
  cancelled: "bg-slate-100 text-slate-600",
  pending_cancel: "bg-amber-50 text-amber-700",
  preorder: "bg-orange-100 text-orange-800",
  lost: "bg-rose-50 text-rose-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

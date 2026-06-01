"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ScanLine } from "lucide-react";

export default function ScanToUpdatePage() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState<OrderStatus>("shipped");
  const [msg, setMsg] = useState("");
  const order = orderId ? getOrder(orderId.trim().toUpperCase()) : undefined;

  const apply = () => {
    const id = orderId.trim().toUpperCase();
    const o = getOrder(id);
    if (!o) {
      setMsg("Order not found");
      return;
    }
    updateOrderStatus(id, status);
    setMsg(`Order ${id} → ${status}`);
  };

  return (
    <div>
      <PageHeader
        title="Scan To Update"
        description="Enter or scan order ID to update status quickly"
      />
      <div className="glass-card mx-auto max-w-md rounded-2xl p-6">
        <div className="mb-4 flex justify-center">
          <ScanLine className="h-16 w-16 text-teal-500" />
        </div>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID e.g. AO-8822"
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-lg outline-none focus:border-teal-400"
        />
        {order && (
          <div className="mb-4 rounded-xl bg-slate-50 p-3 text-center text-sm">
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-slate-500">Current:</p>
            <OrderStatusBadge status={order.status} />
          </div>
        )}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        >
          <option value="rts">RTS</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          onClick={apply}
          className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-violet-600 py-3 text-sm font-bold text-white"
        >
          Update Status
        </button>
        {msg && <p className="mt-3 text-center text-sm text-teal-700">{msg}</p>}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  loadOrders,
  assignCourier,
  getOrder,
  updateOrder,
  appendOrderActivity,
} from "@/lib/orders-store";
import {
  loadActiveDeliveryMethods,
  getDeliveryMethod,
} from "@/lib/delivery-methods-store";
import { createSteadfastShipment } from "@/lib/steadfast-service";
import { getSessionUser } from "@/lib/dev-users";
import { Truck, Loader2, Zap } from "lucide-react";
import clsx from "clsx";

export default function CourierManagementPage() {
  const [refresh, setRefresh] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const deliveryMethods = loadActiveDeliveryMethods();
  const needCourier = loadOrders({ status: "rts" }).filter((o) => !o.trackingId);

  const send = async (orderId: string) => {
    const courierEl = document.getElementById(
      `courier-${orderId}`
    ) as HTMLSelectElement | null;
    const trackEl = document.getElementById(
      `track-${orderId}`
    ) as HTMLInputElement | null;
    const methodId = courierEl?.value ?? "";
    const manualTracking = trackEl?.value?.trim() ?? "";

    const method = getDeliveryMethod(methodId);
    const order = getOrder(orderId);
    if (!order) return;

    setBusyId(orderId);
    setMsg((m) => ({ ...m, [orderId]: "" }));

    try {
      if (
        method?.type === "steadfast" &&
        method.steadfast?.apiKey &&
        method.steadfast.apiSecret &&
        !manualTracking
      ) {
        const result = await createSteadfastShipment(order, methodId);
        if (!result.ok) {
          setMsg((m) => ({ ...m, [orderId]: result.message }));
          return;
        }
        assignCourier(orderId, methodId, result.trackingCode);
        appendOrderActivity(orderId, {
          type: "tracking",
          title: "Sent to Steadfast",
          detail: `Tracking ${result.trackingCode ?? "—"} · ${result.message}`,
          actor: getSessionUser()?.name ?? "Staff",
        });
        if (result.steadfastStatus) {
          updateOrder(orderId, {
            note: [order.note, `Steadfast: ${result.steadfastStatus}`]
              .filter(Boolean)
              .join("\n"),
          });
        }
        setMsg((m) => ({
          ...m,
          [orderId]: `Steadfast OK · ${result.trackingCode}`,
        }));
      } else {
        assignCourier(orderId, methodId, manualTracking || undefined);
        setMsg((m) => ({
          ...m,
          [orderId]: manualTracking
            ? "Courier assigned"
            : "Method saved — add tracking",
        }));
      }
      setRefresh((r) => r + 1);
    } catch (e) {
      setMsg((m) => ({
        ...m,
        [orderId]: e instanceof Error ? e.message : "Failed",
      }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Courier Management"
        description="Assign courier & tracking — Steadfast methods auto-create consignment via API"
      />
      <div className="space-y-3">
        {needCourier.map((o) => {
          const selectedMethod = deliveryMethods.find(
            (m) => m.id === o.deliveryMethodId
          );
          const isSf = selectedMethod?.type === "steadfast";
          return (
            <div
              key={`${o.id}-${refresh}`}
              className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
            >
              <div>
                <p className="font-bold text-teal-700">{o.id}</p>
                <p className="text-sm text-slate-600">
                  {o.customerName} · {o.district} · ৳{o.total.toLocaleString("en-BD")}
                </p>
                {msg[o.id] && (
                  <p
                    className={clsx(
                      "mt-1 text-xs font-semibold",
                      msg[o.id].includes("OK") || msg[o.id].includes("assigned")
                        ? "text-emerald-700"
                        : "text-rose-700"
                    )}
                  >
                    {msg[o.id]}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id={`courier-${o.id}`}
                  defaultValue={o.deliveryMethodId}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {deliveryMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.type === "steadfast" ||
                      m.type === "pathao" ||
                      m.type === "carrybee"
                        ? " (API)"
                        : ""}
                    </option>
                  ))}
                </select>
                <input
                  id={`track-${o.id}`}
                  placeholder={isSf ? "Auto from Steadfast" : "Tracking ID"}
                  className="min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => send(o.id)}
                  className={clsx(
                    "flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white",
                    isSf ? "bg-indigo-600 hover:bg-indigo-700" : "bg-teal-500 hover:bg-teal-600"
                  )}
                >
                  {busyId === o.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSf ? (
                    <Zap className="h-4 w-4" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}
                  {isSf ? "Send to Steadfast" : "Send"}
                </button>
              </div>
            </div>
          );
        })}
        {needCourier.length === 0 && (
          <p className="glass-card rounded-2xl p-8 text-center text-slate-500">
            All approved orders have courier assigned.
          </p>
        )}
      </div>
    </div>
  );
}

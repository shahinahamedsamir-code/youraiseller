import {
  getDeliveryMethod,
  resolveDeliveryMethodId,
  type DeliveryMethod,
} from "./delivery-methods-store";
import { courierSupportsApiEntry } from "./courier-api-utils";
import {
  appendOrderActivity,
  getOrder,
  loadOrders,
  updateOrder,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "./orders-store";
import { ORDER_STATUS_LABELS } from "./order-status-tabs";
import { mapCourierStatusToOrderStatus } from "./courier-status-map";
import { riderAssignedPatchFromCourierStatus } from "./courier-rider-status";
import { fetchCarrybeeOrderStatus } from "./carrybee-service";
import { fetchSteadfastDeliveryStatus } from "./steadfast-service";
import { fetchPathaoOrderStatus } from "./pathao-service";
import { getSessionUser } from "./dev-users";

export type CourierSyncOneResult = {
  orderId: string;
  ok: boolean;
  message: string;
  courierStatus?: string;
  panelStatus?: OrderStatus;
  statusChanged?: boolean;
};

function actorName(): string {
  return getSessionUser()?.name ?? "Staff";
}

function nowIso(): string {
  return new Date().toISOString();
}

export function orderEligibleForCourierSync(order: Order): boolean {
  if (!order.trackingId?.trim()) return false;
  const method = getDeliveryMethod(
    resolveDeliveryMethodId(order.deliveryMethodId ?? order.courier)
  );
  if (!method?.active || !courierSupportsApiEntry(method)) return false;
  return !["cancelled", "lost", "preorder"].includes(order.status);
}

export function loadOrdersForCourierSync(): Order[] {
  return loadOrders().filter(orderEligibleForCourierSync);
}

/** Apply Steadfast delivery_status → panel tab + store raw courier status */
export function applyCourierDeliveryStatus(
  orderId: string,
  deliveryStatus: string,
  opts?: {
    methodName?: string;
    silent?: boolean;
    courierType?: DeliveryMethod["type"];
  }
): CourierSyncOneResult {
  const order = getOrder(orderId);
  if (!order) {
    return { orderId, ok: false, message: "Order not found" };
  }

  const method = getDeliveryMethod(
    resolveDeliveryMethodId(order.deliveryMethodId ?? order.courier)
  );
  const courierType = opts?.courierType ?? method?.type ?? "steadfast";
  const mapped = mapCourierStatusToOrderStatus(courierType, deliveryStatus);
  const prevStatus = order.status;
  const prevCourier = order.courierStatus;

  const riderPatch = riderAssignedPatchFromCourierStatus(
    courierType,
    deliveryStatus
  );

  updateOrder(orderId, {
    courierStatus: deliveryStatus,
    courierSyncedAt: nowIso(),
    ...riderPatch,
  });

  let statusChanged = false;

  // If staff already marked an order as returned, do not let courier polling
  // move it back to an in-progress state (e.g. partial/shipped).
  if (prevStatus === "returned" && mapped && mapped !== "returned") {
    return {
      orderId,
      ok: true,
      message: deliveryStatus,
      courierStatus: deliveryStatus,
      panelStatus: prevStatus,
      statusChanged: false,
    };
  }

  // Don't let courier polling REGRESS an order the seller advanced by hand in
  // the main pipeline (pending → rts → shipped → delivered). E.g. staff moved
  // to Shipped but the courier still reports "in review" (→ rts) — keep Shipped.
  // Forward moves and terminal/branch states (returned, partial, …) still apply.
  const PIPELINE_RANK: Record<string, number> = {
    pending: 0,
    rts: 1,
    shipped: 2,
    delivered: 3,
  };
  if (
    mapped &&
    PIPELINE_RANK[mapped] !== undefined &&
    PIPELINE_RANK[prevStatus] !== undefined &&
    PIPELINE_RANK[mapped] < PIPELINE_RANK[prevStatus]
  ) {
    return {
      orderId,
      ok: true,
      message: deliveryStatus,
      courierStatus: deliveryStatus,
      panelStatus: prevStatus,
      statusChanged: false,
    };
  }

  if (mapped && mapped !== prevStatus) {
    updateOrderStatus(orderId, mapped);
    statusChanged = true;
    if (!opts?.silent) {
      appendOrderActivity(orderId, {
        type: "status",
        title: "Courier status sync",
        detail: `${opts?.methodName ?? "Courier"}: ${deliveryStatus} → ${ORDER_STATUS_LABELS[mapped]}`,
        actor: actorName(),
      });
    }
  } else if (deliveryStatus !== prevCourier && !opts?.silent) {
    appendOrderActivity(orderId, {
      type: "tracking",
      title: "Courier status updated",
      detail: deliveryStatus,
      actor: actorName(),
    });
  }

  return {
    orderId,
    ok: true,
    message: statusChanged
      ? `Moved to ${ORDER_STATUS_LABELS[mapped!]}`
      : deliveryStatus,
    courierStatus: deliveryStatus,
    panelStatus: mapped ?? prevStatus,
    statusChanged,
  };
}

export async function syncOneOrderCourierStatus(
  order: Order,
  method: DeliveryMethod
): Promise<CourierSyncOneResult> {
  if (!courierSupportsApiEntry(method)) {
    return {
      orderId: order.id,
      ok: false,
      message: "Courier API not configured",
    };
  }

  if (!order.trackingId?.trim()) {
    return { orderId: order.id, ok: false, message: "No tracking ID" };
  }

  if (method.type === "carrybee" && method.carrybee) {
    const res = await fetchCarrybeeOrderStatus(
      method.carrybee,
      order.trackingId
    );
    const status = res.transfer_status;
    if (!res.ok || !status) {
      return {
        orderId: order.id,
        ok: false,
        message: res.message ?? "Could not fetch Carrybee status",
      };
    }
    return applyCourierDeliveryStatus(order.id, status, {
      methodName: method.name,
      silent: true,
      courierType: "carrybee",
    });
  }

  if (method.type === "pathao" && method.pathao) {
    const res = await fetchPathaoOrderStatus(
      method.pathao,
      order.trackingId
    );
    const status = res.order_status;
    if (!res.ok || !status) {
      return {
        orderId: order.id,
        ok: false,
        message: res.message ?? "Could not fetch Pathao status",
      };
    }
    return applyCourierDeliveryStatus(order.id, status, {
      methodName: method.name,
      silent: true,
      courierType: "pathao",
    });
  }

  if (method.type === "steadfast" && method.steadfast) {
    const cidRaw = order.courierConsignmentId?.trim();
    const consignmentId =
      cidRaw && /^\d+$/.test(cidRaw) ? parseInt(cidRaw, 10) : undefined;
    const res = await fetchSteadfastDeliveryStatus(method.steadfast, {
      consignmentId,
      trackingCode: consignmentId ? undefined : order.trackingId,
      invoice: order.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64),
    });

    if (!res.ok || !res.delivery_status) {
      return {
        orderId: order.id,
        ok: false,
        message: res.message ?? "Could not fetch courier status",
      };
    }

    return applyCourierDeliveryStatus(order.id, res.delivery_status, {
      methodName: method.name,
      silent: true,
      courierType: "steadfast",
    });
  }

  return {
    orderId: order.id,
    ok: false,
    message: "Courier type not supported for sync",
  };
}

export async function syncAllActiveCourierOrders(): Promise<{
  synced: number;
  changed: number;
  failed: number;
  results: CourierSyncOneResult[];
}> {
  const orders = loadOrdersForCourierSync();
  const results: CourierSyncOneResult[] = [];
  let changed = 0;
  let failed = 0;

  for (const order of orders) {
    const method = getDeliveryMethod(
      resolveDeliveryMethodId(order.deliveryMethodId ?? order.courier)
    );
    if (!method) {
      failed++;
      results.push({
        orderId: order.id,
        ok: false,
        message: "No delivery method",
      });
      continue;
    }

    try {
      const r = await syncOneOrderCourierStatus(order, method);
      results.push(r);
      if (!r.ok) failed++;
      else if (r.statusChanged) changed++;
    } catch (e) {
      failed++;
      results.push({
        orderId: order.id,
        ok: false,
        message: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  if (typeof window !== "undefined" && (changed > 0 || results.some((r) => r.ok))) {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }

  return { synced: orders.length, changed, failed, results };
}

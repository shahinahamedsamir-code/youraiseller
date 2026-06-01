import {
  getDeliveryMethod,
  getDeliveryMethodName,
  loadActiveDeliveryMethods,
  loadDeliveryMethods,
  resolveDeliveryMethodId,
  type DeliveryMethod,
} from "./delivery-methods-store";
import {
  appendOrderActivity,
  getOrder,
  updateOrder,
  updateOrderStatus,
  type Order,
} from "./orders-store";
import { mapCourierStatusToOrderStatus } from "./courier-status-map";
import { createCarrybeeShipment } from "./carrybee-service";
import { createPathaoShipment } from "./pathao-service";
import { createSteadfastShipment } from "./steadfast-service";
import { getSessionUser } from "./dev-users";
import { reportCourierBatchResult } from "./courier-entry-alerts";
import {
  statusAfterCourierPush,
} from "./steadfast-status-map";

import { courierSupportsApiEntry } from "./courier-api-utils";

export { courierSupportsApiEntry } from "./courier-api-utils";

/** Label shown on action buttons — e.g. "Entry to STEADFAST" */
export function getCourierEntryActionLabel(method: DeliveryMethod): string {
  const brand =
    method.type === "steadfast"
      ? "Steadfast"
      : method.type === "pathao"
        ? "Pathao"
        : method.type === "carrybee"
          ? "Carrybee"
          : method.name.trim() || method.type;
  return `Entry to ${brand}`;
}

export function getRefreshCourierStatusLabel(method: DeliveryMethod): string {
  const name =
    method.type === "steadfast"
      ? "Steadfast"
      : method.type === "pathao"
        ? "Pathao"
        : method.type === "carrybee"
          ? "Carrybee"
          : method.name;
  return `Refresh ${name} status`;
}

/**
 * Which delivery method to use for manual courier push:
 * 1) Active list chip (when not "all")
 * 2) Preferred default on delivery method
 * 3) First API-ready active method
 */
export function resolveCourierEntryMethod(opts?: {
  chipDeliveryMethodId?: string;
  orderDeliveryMethodId?: string;
}): DeliveryMethod | undefined {
  const active = loadActiveDeliveryMethods();
  const apiReady = active.find(courierSupportsApiEntry);

  if (opts?.chipDeliveryMethodId && opts.chipDeliveryMethodId !== "all") {
    const chip = getDeliveryMethod(opts.chipDeliveryMethodId);
    if (chip?.active) {
      if (courierSupportsApiEntry(chip)) return chip;
      if (
        chip.type === "steadfast" ||
        chip.type === "pathao" ||
        chip.type === "carrybee"
      ) {
        return chip;
      }
    }
  }

  const preferred = loadDeliveryMethods().find((m) => m.preferred && m.active);
  if (preferred) {
    if (courierSupportsApiEntry(preferred)) return preferred;
    if (
      preferred.type === "steadfast" ||
      preferred.type === "pathao" ||
      preferred.type === "carrybee"
    ) {
      return preferred;
    }
  }

  if (opts?.orderDeliveryMethodId) {
    const orderMethod = getDeliveryMethod(
      resolveDeliveryMethodId(opts.orderDeliveryMethodId)
    );
    if (orderMethod?.active && courierSupportsApiEntry(orderMethod)) {
      return orderMethod;
    }
  }

  return (
    apiReady ??
    active.find(
      (m) =>
        m.type === "steadfast" ||
        m.type === "pathao" ||
        m.type === "carrybee"
    ) ??
    active[0]
  );
}

export type CourierEntryResult = {
  orderId: string;
  ok: boolean;
  message: string;
  trackingCode?: string;
  skipped?: boolean;
};

function actorName(): string {
  return getSessionUser()?.name ?? "Staff";
}

export function markCourierUploaded(
  orderId: string,
  methodId: string,
  trackingCode: string,
  detail?: string,
  initialCourierStatus?: string,
  courierConsignmentId?: string
): void {
  const order = getOrder(orderId);
  if (!order) return;

  const deliveryMethodId = resolveDeliveryMethodId(methodId);
  const nextStatus = statusAfterCourierPush(order.status);
  const courierRaw = initialCourierStatus ?? "in_review";

  updateOrder(orderId, {
    deliveryMethodId,
    courier: getDeliveryMethodName(deliveryMethodId),
    trackingId: trackingCode,
    ...(courierConsignmentId?.trim()
      ? { courierConsignmentId: courierConsignmentId.trim() }
      : {}),
    courierStatus: courierRaw,
    courierRiderAssigned: false,
    courierSyncedAt: new Date().toISOString(),
  });

  if (order.status !== nextStatus) {
    updateOrderStatus(orderId, nextStatus);
  }

  appendOrderActivity(orderId, {
    type: "tracking",
    title: "Courier entry",
    detail: detail ?? `Tracking ${trackingCode} · Panel: ${nextStatus.toUpperCase()}`,
    actor: actorName(),
  });

  const method = getDeliveryMethod(methodId);
  const mapped = method
    ? mapCourierStatusToOrderStatus(method.type, courierRaw)
    : null;
  if (mapped && mapped !== nextStatus) {
    updateOrderStatus(orderId, mapped);
  }
}

async function pushOneToSteadfast(
  order: Order,
  method: DeliveryMethod
): Promise<CourierEntryResult> {
  if (order.trackingId?.trim()) {
    return {
      orderId: order.id,
      ok: false,
      skipped: true,
      message: "Already has tracking — skip or refresh status",
    };
  }

  const result = await createSteadfastShipment(order, method.id);
  if (!result.ok) {
    return { orderId: order.id, ok: false, message: result.message };
  }

  const tracking = result.trackingCode?.trim();
  const consignmentId = result.consignmentId
    ? String(result.consignmentId)
    : undefined;
  if (!tracking && !consignmentId) {
    return {
      orderId: order.id,
      ok: false,
      message: "No tracking code or consignment ID returned from Steadfast",
    };
  }

  markCourierUploaded(
    order.id,
    method.id,
    tracking ?? consignmentId!,
    `Steadfast · ${result.steadfastStatus ?? "in_review"} · ${result.message}`,
    result.steadfastStatus ?? "in_review",
    consignmentId
  );

  const updated = getOrder(order.id);
  const panelStatus = updated?.status ?? "rts";

  void import("./courier-status-sync").then((m) => {
    const o = getOrder(order.id);
    if (o?.trackingId) void m.syncOneOrderCourierStatus(o, method);
  });

  return {
    orderId: order.id,
    ok: true,
    message: `${result.message} → ${panelStatus.toUpperCase()} tab`,
    trackingCode: tracking,
  };
}

async function pushOneToPathao(
  order: Order,
  method: DeliveryMethod
): Promise<CourierEntryResult> {
  if (order.trackingId?.trim()) {
    return {
      orderId: order.id,
      ok: false,
      skipped: true,
      message: "Already has tracking — skip or refresh status",
    };
  }

  const result = await createPathaoShipment(order, method.id);
  if (!result.ok) {
    return { orderId: order.id, ok: false, message: result.message };
  }

  const tracking = result.trackingCode?.trim();
  if (!tracking) {
    return {
      orderId: order.id,
      ok: false,
      message: "No consignment_id returned from Pathao",
    };
  }

  markCourierUploaded(
    order.id,
    method.id,
    tracking,
    `Pathao · ${result.pathaoStatus ?? "Pending"} · ${result.message}`,
    result.pathaoStatus ?? "Pending",
    tracking
  );

  const updated = getOrder(order.id);
  const panelStatus = updated?.status ?? "rts";

  void import("./courier-status-sync").then((m) => {
    const o = getOrder(order.id);
    if (o?.trackingId) void m.syncOneOrderCourierStatus(o, method);
  });

  return {
    orderId: order.id,
    ok: true,
    message: `${result.message} → ${panelStatus.toUpperCase()} tab`,
    trackingCode: tracking,
  };
}

async function pushOneToCarrybee(
  order: Order,
  method: DeliveryMethod
): Promise<CourierEntryResult> {
  if (order.trackingId?.trim()) {
    return {
      orderId: order.id,
      ok: false,
      skipped: true,
      message: "Already has tracking — skip or refresh status",
    };
  }

  const result = await createCarrybeeShipment(order, method.id);
  if (!result.ok) {
    return { orderId: order.id, ok: false, message: result.message };
  }

  const tracking = result.trackingCode?.trim();
  if (!tracking) {
    return {
      orderId: order.id,
      ok: false,
      message: "No consignment_id returned from Carrybee",
    };
  }

  markCourierUploaded(
    order.id,
    method.id,
    tracking,
    `Carrybee · ${result.carrybeeStatus ?? "Pending"} · ${result.message}`,
    result.carrybeeStatus ?? "Pending",
    tracking
  );

  const updated = getOrder(order.id);
  const panelStatus = updated?.status ?? "rts";

  void import("./courier-status-sync").then((m) => {
    const o = getOrder(order.id);
    if (o?.trackingId) void m.syncOneOrderCourierStatus(o, method);
  });

  return {
    orderId: order.id,
    ok: true,
    message: `${result.message} → ${panelStatus.toUpperCase()} tab`,
    trackingCode: tracking,
  };
}

/** Manual push only — call from UI button, never auto-sync. */
export async function pushOrdersToCourier(
  orderIds: string[],
  methodId: string
): Promise<{
  ok: number;
  fail: number;
  skipped: number;
  results: CourierEntryResult[];
}> {
  const method = getDeliveryMethod(methodId);
  if (!method?.active) {
    return {
      ok: 0,
      fail: orderIds.length,
      skipped: 0,
      results: orderIds.map((id) => ({
        orderId: id,
        ok: false,
        message: "Delivery method not found or inactive",
      })),
    };
  }

  if (!courierSupportsApiEntry(method)) {
    return {
      ok: 0,
      fail: orderIds.length,
      skipped: 0,
      results: orderIds.map((id) => ({
        orderId: id,
        ok: false,
        message: `API not configured for ${method.name}. Add keys in Delivery Methods.`,
      })),
    };
  }

  const results: CourierEntryResult[] = [];

  for (const id of orderIds) {
    const order = getOrder(id);
    if (!order) {
      results.push({ orderId: id, ok: false, message: "Order not found" });
      continue;
    }
    if (method.type === "steadfast") {
      results.push(await pushOneToSteadfast(order, method));
    } else if (method.type === "pathao") {
      results.push(await pushOneToPathao(order, method));
    } else if (method.type === "carrybee") {
      results.push(await pushOneToCarrybee(order, method));
    } else {
      results.push({
        orderId: id,
        ok: false,
        message: `${method.name} API integration coming soon`,
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.skipped).length;
  const fail = results.length - ok - skipped;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
    reportCourierBatchResult(
      { ok, fail, skipped, results },
      method.name
    );
  }

  return { ok, fail, skipped, results };
}

export async function refreshCourierStatusForOrders(
  orderIds: string[],
  methodId: string
): Promise<{
  updated: number;
  statusChanged: number;
  results: {
    orderId: string;
    status?: string;
    message: string;
    panelStatus?: string;
  }[];
}> {
  const method = getDeliveryMethod(methodId);
  if (!method || !courierSupportsApiEntry(method)) {
    return {
      updated: 0,
      statusChanged: 0,
      results: orderIds.map((id) => ({
        orderId: id,
        message: "Courier API not configured",
      })),
    };
  }

  const { syncOneOrderCourierStatus } = await import("./courier-status-sync");
  const results: {
    orderId: string;
    status?: string;
    message: string;
    panelStatus?: string;
  }[] = [];
  let updated = 0;
  let statusChanged = 0;

  for (const id of orderIds) {
    const order = getOrder(id);
    if (!order?.trackingId) {
      results.push({ orderId: id, message: "No tracking ID" });
      continue;
    }

    const r = await syncOneOrderCourierStatus(order, method);
    if (r.ok) {
      updated++;
      if (r.statusChanged) statusChanged++;
      results.push({
        orderId: id,
        status: r.courierStatus,
        panelStatus: r.panelStatus,
        message: r.message,
      });
    } else {
      results.push({ orderId: id, message: r.message });
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
    if (statusChanged > 0) {
      const { showCourierAlert } = await import("./courier-entry-alerts");
      showCourierAlert({
        type: "success",
        title: "Courier status synced",
        message: `${statusChanged} order(s) moved to new status tab.`,
      });
    }
  }

  return { updated, statusChanged, results };
}

"use client";

import type { Order } from "./orders-store";
import { getSellerStorageScope } from "./seller-storage";
import { isInWebQueue } from "./web-order-queue";
import { matchesWebOrderTab } from "./web-order-tabs";
import {
  pollAutoCallStatuses,
  refreshAutoCallAccount,
  saveAutoCallAccountFromApi,
} from "./auto-call-store";
import { normalizeAutoCallAccount } from "./auto-call-types";

export function shouldTriggerWebAutoCall(order: Order): boolean {
  if (order.isPreorder || order.status === "preorder") return false;
  if (order.source !== "web") return false;
  if (!isInWebQueue(order)) return false;
  if (!order.phone?.trim()) return false;
  return matchesWebOrderTab(order, "processing");
}

/** Fire-and-forget auto call when a new web order lands on Processing. */
export function triggerAutoCallWebOrder(
  order: Pick<Order, "id" | "phone" | "customerName">
): void {
  if (typeof window === "undefined") return;
  const scope = getSellerStorageScope();
  if (!scope || !order.phone?.trim()) return;

  void sendWebOrderAutoCall(order).catch(() => {
    /* offline — order save still succeeds */
  });
}

export async function sendWebOrderAutoCall(
  order: Pick<Order, "id" | "phone" | "customerName">,
  opts?: { manual?: boolean }
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not available on server." };
  }
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in." };

  try {
    const res = await fetch("/api/auto-call/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        manual: opts?.manual === true,
        order: {
          id: order.id,
          phone: order.phone,
          customerName: order.customerName,
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      skipped?: string;
      account?: unknown;
    };

    if (json.account) {
      saveAutoCallAccountFromApi(normalizeAutoCallAccount(json.account));
    }

    await pollAutoCallStatuses();
    await refreshAutoCallAccount();

    if (json.skipped) {
      return { ok: false, skipped: json.skipped };
    }
    if (!json.ok) {
      return { ok: false, error: json.error ?? "Auto call failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — try again." };
  }
}

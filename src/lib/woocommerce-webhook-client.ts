import { getSessionUserId } from "./dev-users";
import { loadWooCommerceSettings } from "./woocommerce-integration-store";
import { refreshWooOrderFromApi } from "./woocommerce-order-sync";

/** Enable instant order sync — registers an order.created webhook in WooCommerce. */
export async function registerWooInstantSync(): Promise<{
  ok: boolean;
  message?: string;
  webhookId?: number | null;
}> {
  const sellerId = getSessionUserId();
  if (!sellerId) return { ok: false, message: "Sign in first." };
  const woo = loadWooCommerceSettings();
  const res = await fetch("/api/webhooks/woocommerce/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerId,
      storeUrl: woo.storeUrl.trim(),
      consumerKey: woo.consumerKey.trim(),
      consumerSecret: woo.consumerSecret.trim(),
    }),
  });
  return res.json();
}

/**
 * Pull webhook-delivered orders from the server queue and import each one.
 * Re-fetches the full order from WooCommerce (reusing the regular sync path)
 * so the data is identical to a manual sync — just triggered instantly.
 */
export async function pullAndApplyWooWebhooks(): Promise<{ applied: number }> {
  const sellerId = getSessionUserId();
  if (!sellerId) return { applied: 0 };

  const res = await fetch(
    `/api/webhooks/woocommerce/pending?sellerId=${encodeURIComponent(sellerId)}`,
    { cache: "no-store" }
  );
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    events?: { payload?: { id?: number } }[];
  };
  if (!data.ok || !Array.isArray(data.events) || data.events.length === 0) {
    return { applied: 0 };
  }

  // De-dupe order ids within this batch (Woo can fire create + a quick update).
  const ids = Array.from(
    new Set(
      data.events
        .map((e) => Number(e?.payload?.id))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );

  let applied = 0;
  for (const id of ids) {
    try {
      await refreshWooOrderFromApi(id);
      applied++;
    } catch {
      /* skip — the 20s list sync will still catch it */
    }
  }
  return { applied };
}

/** Normalized courier delivery stats from Hoorin Order Guard API. */
export type CourierStat = {
  name: string;
  total: number;
  delivered: number;
  cancelled: number;
  successRate: number;
};

export type CourierCheckResult = {
  overall: CourierStat;
  couriers: CourierStat[];
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function rate(delivered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((delivered / total) * 100);
}

function statFrom(name: string, total: number, delivered: number, cancelled: number): CourierStat {
  return {
    name,
    total,
    delivered,
    cancelled,
    successRate: rate(delivered, total),
  };
}

/** Parse one courier block — field names differ per courier in Hoorin responses. */
function parseCourierBlock(name: string, block: Record<string, unknown>): CourierStat {
  const total = num(
    block["Total Parcels"] ??
      block["Total Delivery"] ??
      block.total ??
      block.totalParcels
  );
  const delivered = num(
    block["Delivered Parcels"] ??
      block["Successful Delivery"] ??
      block.delivered ??
      block.deliveredParcels
  );
  const cancelled = num(
    block["Canceled Parcels"] ??
      block["Cancelled Parcels"] ??
      block["Canceled Delivery"] ??
      block.cancelled ??
      block.canceled
  );
  const t = total || delivered + cancelled;
  return statFrom(name, t, delivered, cancelled);
}

/** Merge Hoorin `/api/courier/api` + `/api/courier/sheet` payloads. */
export function parseHoorinResponses(
  summariesJson: unknown,
  sheetJson: unknown
): CourierCheckResult {
  const couriers: CourierStat[] = [];

  const summariesRoot =
    summariesJson && typeof summariesJson === "object"
      ? (summariesJson as Record<string, unknown>)
      : {};
  const summaries =
    (summariesRoot.Summaries as Record<string, Record<string, unknown>> | undefined) ??
    (summariesRoot.summaries as Record<string, Record<string, unknown>> | undefined) ??
    {};

  for (const [name, block] of Object.entries(summaries)) {
    if (!block || typeof block !== "object") continue;
    const s = parseCourierBlock(name, block as Record<string, unknown>);
    if (s.total > 0 || s.delivered > 0 || s.cancelled > 0) couriers.push(s);
  }

  const sheetRoot =
    sheetJson && typeof sheetJson === "object"
      ? (sheetJson as Record<string, unknown>)
      : {};
  const totalSummary =
    (sheetRoot.totalSummary as Record<string, unknown> | undefined) ??
    (sheetRoot.TotalSummary as Record<string, unknown> | undefined);

  let overall: CourierStat;
  if (totalSummary) {
    overall = parseCourierBlock("Overall", totalSummary);
    overall.name = "Overall";
  } else if (couriers.length) {
    const total = couriers.reduce((s, c) => s + c.total, 0);
    const delivered = couriers.reduce((s, c) => s + c.delivered, 0);
    const cancelled = couriers.reduce((s, c) => s + c.cancelled, 0);
    overall = statFrom("Overall", total, delivered, cancelled);
  } else {
    overall = statFrom("Overall", 0, 0, 0);
  }

  const order = ["Pathao", "RedX", "Steadfast", "Paperfly"];
  couriers.sort((a, b) => {
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return { overall, couriers };
}

export function normalizePhoneForApi(phone: string): string | null {
  const digits = phone.replace(/\D/g, "").slice(-11);
  return digits.length === 11 ? digits : null;
}

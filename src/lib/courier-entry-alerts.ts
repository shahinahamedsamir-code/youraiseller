export type CourierAlertType = "success" | "error" | "warning";

export type CourierAlertDetail = {
  type: CourierAlertType;
  title: string;
  message: string;
};

const EVENT = "youraiseller-courier-alert";

/** Fixed toast + browser alert so push result is impossible to miss */
export function showCourierAlert(detail: CourierAlertDetail): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent<CourierAlertDetail>(EVENT, { detail }));

  const prefix =
    detail.type === "success" ? "✓" : detail.type === "error" ? "✗" : "!";
  window.alert(`${prefix} ${detail.title}\n\n${detail.message}`);
}

export function onCourierAlert(handler: (d: CourierAlertDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const fn = (e: Event) => {
    const ce = e as CustomEvent<CourierAlertDetail>;
    if (ce.detail) handler(ce.detail);
  };
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function reportCourierBatchResult(
  batch: {
    ok: number;
    fail: number;
    skipped: number;
    results: { orderId: string; ok: boolean; message: string; trackingCode?: string; skipped?: boolean }[];
  },
  courierName: string
): void {
  const firstOk = batch.results.find((r) => r.ok);
  const firstFail = batch.results.find((r) => !r.ok && !r.skipped);
  const firstSkip = batch.results.find((r) => r.skipped);

  if (batch.ok > 0 && batch.fail === 0 && batch.skipped === 0) {
    const track = firstOk?.trackingCode ? `\nTracking: ${firstOk.trackingCode}` : "";
    const multi =
      batch.ok > 1
        ? `\n${batch.ok} orders pushed to ${courierName}.`
        : `\nOrder ${firstOk?.orderId ?? ""} pushed to ${courierName}.`;
    showCourierAlert({
      type: "success",
      title: "Courier push successful",
      message: `${firstOk?.message ?? "Consignment created."}${track}${multi}\nPending → RTS · RTS stays RTS until courier ships.`,
    });
    return;
  }

  if (batch.ok > 0) {
    showCourierAlert({
      type: "warning",
      title: "Partial courier push",
      message: `${batch.ok} sent, ${batch.fail} failed, ${batch.skipped} skipped.${
        firstFail ? `\nError: ${firstFail.message}` : ""
      }`,
    });
    return;
  }

  if (batch.skipped > 0 && batch.fail === 0) {
    showCourierAlert({
      type: "warning",
      title: "Nothing pushed",
      message:
        firstSkip?.message ??
        "Selected orders already have tracking. Clear tracking or use Refresh status.",
    });
    return;
  }

  showCourierAlert({
    type: "error",
    title: "Courier push failed",
    message:
      firstFail?.message ??
      `Could not push to ${courierName}. Check API keys and customer phone (11 digits).`,
  });
}

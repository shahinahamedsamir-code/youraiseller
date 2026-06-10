"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Camera, Keyboard, ScanLine, Send } from "lucide-react";
import clsx from "clsx";

type ScanTab = "shipping" | "return" | "rts";

type ScanResult = {
  id: string;
  type: "success" | "failed" | "duplicate";
  message: string;
  scannedAt: string;
  targetStatus: OrderStatus;
};

type ScannerMode = "keyboard" | "barcode" | "phone";

const TAB_CONFIG: Record<ScanTab, { label: string; status: OrderStatus }> = {
  shipping: { label: "Scan To Shipping", status: "shipped" },
  return: { label: "Scan To Return", status: "pending_return" },
  rts: { label: "Scan To RTS", status: "rts" },
};

function resolveStatusByScanTab(
  tab: ScanTab,
  current: OrderStatus
): { ok: true; next: OrderStatus } | { ok: false; message: string } {
  if (tab === "shipping") {
    if (current === "pending" || current === "rts") {
      return { ok: true, next: "shipped" };
    }
    return {
      ok: false,
      message: `Shipping scan works from Pending/RTS only (current: ${current})`,
    };
  }

  if (tab === "rts") {
    if (current === "pending") {
      return { ok: true, next: "rts" };
    }
    return {
      ok: false,
      message: `RTS scan works from Pending only (current: ${current})`,
    };
  }

  // Return tab: allow from any current status, move directly to returned.
  return { ok: true, next: "returned" };
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ScanToUpdatePage() {
  const [tab, setTab] = useState<ScanTab>("shipping");
  const [scannerMode, setScannerMode] = useState<ScannerMode>("barcode");
  const [orderId, setOrderId] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRegionId = "scan-camera-region";
  const qrRef = useRef<any>(null);
  const keyboardBufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const scannedKeysRef = useRef<Set<string>>(new Set());
  const cameraScanLockRef = useRef(false);
  const lastCameraScanRef = useRef<{ code: string; at: number } | null>(null);
  const targetStatus = TAB_CONFIG[tab].status;
  const isAutoMode = scannerMode === "barcode" || scannerMode === "phone";
  const order = orderId ? getOrder(orderId.trim().toUpperCase()) : undefined;

  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter((r) => r.type === "success").length;
    return { total, success, failed: total - success };
  }, [results]);

  const recordResult = (entry: ScanResult) => {
    setResults((prev) => [entry, ...prev].slice(0, 25));
    setMsg(entry.message);
  };

  const applyScan = (raw: string) => {
    const id = raw.trim().toUpperCase();
    if (!id) return;
    const o = getOrder(id);
    if (!o) {
      recordResult({
        id,
        type: "failed",
        message: `Order ${id} not found`,
        scannedAt: nowTimeLabel(),
        targetStatus,
      });
      return;
    }

    const resolved = resolveStatusByScanTab(tab, o.status);
    if (!resolved.ok) {
      recordResult({
        id,
        type: "failed",
        message: resolved.message,
        scannedAt: nowTimeLabel(),
        targetStatus,
      });
      return;
    }

    const nextStatus = resolved.next;
    const scanKey = `${nextStatus}:${id}`;
    if (scannedKeysRef.current.has(scanKey) || o.status === nextStatus) {
      recordResult({
        id,
        type: "duplicate",
        message: `Duplicate scan: ${id} already updated to ${nextStatus}`,
        scannedAt: nowTimeLabel(),
        targetStatus: nextStatus,
      });
      return;
    }
    updateOrderStatus(id, nextStatus);
    scannedKeysRef.current.add(scanKey);
    recordResult({
      id,
      type: "success",
      message: `Order ${id} → ${nextStatus}`,
      scannedAt: nowTimeLabel(),
      targetStatus: nextStatus,
    });
    setOrderId("");
    setManualOrderId("");
    inputRef.current?.focus();
  };

  const applyPrimary = () => {
    if (scannerMode !== "keyboard") return;
    applyScan(orderId);
  };
  const applyManual = () => applyScan(manualOrderId);

  const stopCamera = async () => {
    const qr = qrRef.current;
    if (!qr) return;
    try {
      await qr.stop();
    } catch {
      // ignore stop errors
    }
    try {
      await qr.clear();
    } catch {
      // ignore clear errors
    }
    qrRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    if (cameraBusy || cameraOn) return;
    setCameraBusy(true);
    setMsg("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode(cameraRegionId);
      qrRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decodedText: string) => {
          const code = decodedText.trim().toUpperCase();
          if (!code) return;
          if (cameraScanLockRef.current) return;

          const now = Date.now();
          const last = lastCameraScanRef.current;
          // Prevent rapid duplicate reads while the same sticker stays in frame.
          if (last && last.code === code && now - last.at < 1500) return;

          cameraScanLockRef.current = true;
          lastCameraScanRef.current = { code, at: now };
          applyScan(decodedText);
          window.setTimeout(() => {
            cameraScanLockRef.current = false;
          }, 350);
        },
        () => {
          // scan miss - ignore
        }
      );
      setCameraOn(true);
    } catch {
      setMsg("Camera start failed. Check browser permission and HTTPS.");
      qrRef.current = null;
      setCameraOn(false);
    } finally {
      setCameraBusy(false);
    }
  };

  const activateKeyboardMode = async () => {
    await stopCamera();
    keyboardBufferRef.current = "";
    setScannerMode("keyboard");
    inputRef.current?.focus();
    setMsg("Keyboard scanner mode active. Type invoice and press Enter.");
  };

  const activateBarcodeMode = async () => {
    await stopCamera();
    keyboardBufferRef.current = "";
    setScannerMode("barcode");
    inputRef.current?.focus();
    setMsg("Barcode scanner mode active. Scan sticker and press Enter.");
  };

  const activatePhoneMode = async () => {
    setScannerMode("phone");
    await startCamera();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (scannerMode !== "barcode" || cameraOn) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      const isTypingOnInput =
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.tagName === "SELECT" ||
        active?.isContentEditable;
      if (isTypingOnInput) return;

      if (e.key === "Enter") {
        const code = keyboardBufferRef.current.trim();
        if (!code) return;
        applyScan(code);
        keyboardBufferRef.current = "";
        return;
      }
      if (e.key.length !== 1) return;

      const now = Date.now();
      if (now - lastKeyAtRef.current > 100) {
        keyboardBufferRef.current = "";
      }
      lastKeyAtRef.current = now;
      keyboardBufferRef.current += e.key;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [targetStatus, scannerMode, cameraOn]);

  return (
    <div>
      <PageHeader
        title="Scan To Update"
        description="Scan invoice/barcode or type order ID to update status quickly"
      />

      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-0 border-b border-slate-100 px-2 pt-2 sm:px-4">
          {(Object.keys(TAB_CONFIG) as ScanTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4",
                tab === key
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {TAB_CONFIG[key].label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
            <h2 className="mb-3 text-center text-lg font-bold text-slate-800">{TAB_CONFIG[tab].label}</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void activateKeyboardMode()}
                className={clsx(
                  "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                  scannerMode === "keyboard"
                    ? "border-teal-300 bg-teal-500 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <Keyboard className="h-4 w-4" />
                Keyboard scanner
              </button>
              <button
                type="button"
                onClick={() => void activateBarcodeMode()}
                className={clsx(
                  "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                  scannerMode === "barcode"
                    ? "border-indigo-300 bg-indigo-500 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <ScanLine className="h-4 w-4" />
                Barcode scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scannerMode === "phone" && cameraOn) {
                    void stopCamera();
                    setScannerMode("barcode");
                    return;
                  }
                  void activatePhoneMode();
                }}
                disabled={cameraBusy}
                className={clsx(
                  "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white",
                  scannerMode === "phone" && cameraOn
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-teal-600 hover:bg-teal-700",
                  cameraBusy && "cursor-not-allowed opacity-70"
                )}
              >
                <Camera className="h-4 w-4" />
                {cameraBusy
                  ? "Starting..."
                  : scannerMode === "phone" && cameraOn
                    ? "Stop phone scanner"
                    : "Phone scanner"}
              </button>
            </div>

            {scannerMode === "phone" ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div
                  id={cameraRegionId}
                className="mx-auto min-h-[170px] w-full max-w-[520px] rounded-lg bg-white sm:min-h-[190px]"
                />
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-700">
                <ScanLine className="h-3.5 w-3.5" />
                {scannerMode === "keyboard"
                  ? "Keyboard scanner active - Type and press Enter"
                  : scannerMode === "barcode"
                    ? "Barcode scanner active - Ready to scan"
                    : "Phone scanner active - Show sticker in camera"}
              </p>
              {scannerMode === "keyboard" ? (
                <div className="rounded-lg border border-slate-300 bg-white p-1.5">
                  <input
                    ref={inputRef}
                    value={orderId}
                    onChange={(e) => {
                      setOrderId(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyPrimary();
                      }
                    }}
                    placeholder="Type invoice and press Enter..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-teal-500"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
                  {scannerMode === "barcode"
                    ? "Auto mode: barcode scanner code + Enter পেলেই status update হবে।"
                    : "Auto mode: phone camera barcode read করলেই status update হবে।"}
                </div>
              )}
            </div>

            {!isAutoMode && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <span className="shrink-0 text-sm text-slate-600">Manual:</span>
                  <input
                    value={manualOrderId}
                    onChange={(e) => setManualOrderId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyManual();
                      }
                    }}
                    placeholder="Enter invoice # manually..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={applyManual}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 sm:ml-0"
                    title="Submit manual invoice"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {order && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold text-slate-800">{order.customerName}</p>
                <p className="text-xs text-slate-500">Current status:</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total Scans</p>
                <p className="font-bold text-teal-700">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Successful</p>
                <p className="font-bold text-emerald-700">{stats.success}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-xs text-rose-700">Failed</p>
                <p className="font-bold text-rose-700">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Recent Scans</h3>
            <div className="max-h-[260px] space-y-2 overflow-y-auto sm:max-h-[320px] lg:max-h-[560px]">
              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  No scans yet
                </div>
              ) : (
                results.map((r, idx) => (
                  <div
                    key={`${r.id}-${r.scannedAt}-${idx}`}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-sm",
                      r.type === "success"
                        ? "border-emerald-200 bg-emerald-50"
                        : r.type === "duplicate"
                          ? "border-amber-200 bg-amber-50"
                          : "border-rose-200 bg-rose-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-semibold text-slate-800">{r.id}</p>
                      <span className="text-[11px] text-slate-500">{r.scannedAt}</span>
                    </div>
                    <p
                      className={clsx(
                        "text-xs",
                        r.type === "success"
                          ? "text-emerald-700"
                          : r.type === "duplicate"
                            ? "text-amber-700"
                            : "text-rose-700"
                      )}
                    >
                      {r.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {msg && <p className="mt-3 text-center text-sm font-medium text-teal-700">{msg}</p>}
    </div>
  );
}

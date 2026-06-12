"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSessionUser } from "@/lib/dev-users";
import { getOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";
import {
  appendScanLog,
  loadScanLogs,
  type ScanLogEntry,
} from "@/lib/scan-log-store";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Camera, Keyboard, ScanLine, Send } from "lucide-react";
import clsx from "clsx";

type ScanTab = "shipping" | "return" | "rts";

type ScanResult = ScanLogEntry;

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

export default function ScanToUpdatePage() {
  const [tab, setTab] = useState<ScanTab>("shipping");
  const [scannerMode, setScannerMode] = useState<ScannerMode>("barcode");
  const [orderId, setOrderId] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<ScanResult[]>(() => loadScanLogs().slice(0, 25));
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
    const duplicate = results.filter((r) => r.type === "duplicate").length;
    return { total, success, failed: total - success - duplicate, duplicate };
  }, [results]);

  const recordResult = (entry: Omit<ScanResult, "id" | "scannedAt" | "scanTab" | "actor">) => {
    const actor = getSessionUser()?.name?.trim() || "Staff";
    const saved = appendScanLog({
      ...entry,
      scanTab: tab,
      actor,
    });
    setResults((prev) => [saved, ...prev].slice(0, 25));
    setMsg(saved.message);
  };

  const applyScan = (raw: string) => {
    const id = raw.trim().toUpperCase();
    if (!id) return;
    const o = getOrder(id);
    if (!o) {
      recordResult({
        orderId: id,
        type: "failed",
        message: `Order ${id} not found`,
        targetStatus,
      });
      return;
    }

    const resolved = resolveStatusByScanTab(tab, o.status);
    if (!resolved.ok) {
      recordResult({
        orderId: id,
        type: "failed",
        message: resolved.message,
        targetStatus,
      });
      return;
    }

    const nextStatus = resolved.next;
    const scanKey = `${nextStatus}:${id}`;
    if (scannedKeysRef.current.has(scanKey) || o.status === nextStatus) {
      recordResult({
        orderId: id,
        type: "duplicate",
        message: `Duplicate scan: ${id} already updated to ${nextStatus}`,
        targetStatus: nextStatus,
      });
      return;
    }
    updateOrderStatus(id, nextStatus);
    scannedKeysRef.current.add(scanKey);
    recordResult({
      orderId: id,
      type: "success",
      message: `Order ${id} → ${nextStatus}`,
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
                "border-b-2 px-2 py-2.5 text-xs font-semibold transition sm:px-4 sm:py-3 sm:text-sm",
                tab === key
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {TAB_CONFIG[key].label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-3 sm:grid-cols-[1.2fr_0.8fr] sm:p-4">
          <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
            <h2 className="mb-3 text-center text-base font-bold text-slate-800 sm:text-lg">{TAB_CONFIG[tab].label}</h2>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void activateKeyboardMode()}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs font-semibold sm:flex-none sm:gap-2 sm:px-3 sm:text-sm",
                  scannerMode === "keyboard"
                    ? "border-teal-300 bg-teal-500 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <Keyboard className="h-4 w-4 shrink-0" />
                <span>Keyboard<span className="hidden sm:inline"> scanner</span></span>
              </button>
              <button
                type="button"
                onClick={() => void activateBarcodeMode()}
                className={clsx(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs font-semibold sm:flex-none sm:gap-2 sm:px-3 sm:text-sm",
                  scannerMode === "barcode"
                    ? "border-indigo-300 bg-indigo-500 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                <ScanLine className="h-4 w-4 shrink-0" />
                <span>Barcode<span className="hidden sm:inline"> scanner</span></span>
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
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs font-semibold text-white sm:flex-none sm:gap-2 sm:px-3 sm:text-sm",
                  scannerMode === "phone" && cameraOn
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-teal-600 hover:bg-teal-700",
                  cameraBusy && "cursor-not-allowed opacity-70"
                )}
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>
                  {cameraBusy ? (
                    "Starting..."
                  ) : scannerMode === "phone" && cameraOn ? (
                    <><span className="sm:hidden">Stop</span><span className="hidden sm:inline">Stop phone scanner</span></>
                  ) : (
                    <><span className="sm:hidden">Phone</span><span className="hidden sm:inline">Phone scanner</span></>
                  )}
                </span>
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

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
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
            <div className="max-h-[200px] space-y-2 overflow-y-auto sm:max-h-[420px] lg:max-h-[560px]">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-10 text-center">
                  <ScanLine className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-400">No scans yet</p>
                  <p className="text-xs text-slate-300">Scan an invoice to see results here</p>
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
                      <p className="font-mono font-semibold text-slate-800">{r.orderId}</p>
                      <span className="text-[11px] text-slate-500">
                        {new Date(r.scannedAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Camera, Keyboard, ScanLine } from "lucide-react";
import clsx from "clsx";

type ScanTab = "shipping" | "return" | "rts";

type ScanResult = {
  id: string;
  ok: boolean;
  message: string;
  scannedAt: string;
  targetStatus: OrderStatus;
};

const TAB_CONFIG: Record<ScanTab, { label: string; status: OrderStatus }> = {
  shipping: { label: "Scan To Shipping", status: "shipped" },
  return: { label: "Scan To Return", status: "pending_return" },
  rts: { label: "Scan To RTS", status: "rts" },
};

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ScanToUpdatePage() {
  const [tab, setTab] = useState<ScanTab>("shipping");
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRegionId = "scan-camera-region";
  const qrRef = useRef<any>(null);
  const keyboardBufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const targetStatus = TAB_CONFIG[tab].status;
  const order = orderId ? getOrder(orderId.trim().toUpperCase()) : undefined;

  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter((r) => r.ok).length;
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
        ok: false,
        message: `Order ${id} not found`,
        scannedAt: nowTimeLabel(),
        targetStatus,
      });
      return;
    }
    updateOrderStatus(id, targetStatus);
    recordResult({
      id,
      ok: true,
      message: `Order ${id} → ${targetStatus}`,
      scannedAt: nowTimeLabel(),
      targetStatus,
    });
    setOrderId("");
    inputRef.current?.focus();
  };

  const applyManual = () => applyScan(orderId);

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
          applyScan(decodedText);
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
  }, [targetStatus]);

  return (
    <div>
      <PageHeader
        title="Scan To Update"
        description="Scan invoice/barcode or type order ID to update status quickly"
      />

      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex gap-0 border-b border-slate-100 px-4 pt-2">
          {(Object.keys(TAB_CONFIG) as ScanTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "border-b-2 px-4 py-3 text-sm font-semibold transition",
                tab === key
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {TAB_CONFIG[key].label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="mb-3 text-center text-lg font-bold text-slate-800">{TAB_CONFIG[tab].label}</h2>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <Keyboard className="h-4 w-4" />
                Keyboard scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cameraOn) void stopCamera();
                  else void startCamera();
                }}
                disabled={cameraBusy}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white",
                  cameraOn
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-teal-600 hover:bg-teal-700",
                  cameraBusy && "cursor-not-allowed opacity-70"
                )}
              >
                <Camera className="h-4 w-4" />
                {cameraBusy ? "Starting..." : cameraOn ? "Stop camera" : "Use phone camera"}
              </button>
            </div>

            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div
                id={cameraRegionId}
                className="mx-auto min-h-[180px] w-full max-w-[520px] rounded-lg bg-white"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Scan sticker with scanner, then press Enter (or type manually)
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyManual();
                    }
                  }}
                  placeholder="Enter invoice / order ID manually..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={applyManual}
                  className="rounded-lg bg-gradient-to-r from-teal-500 to-violet-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Update
                </button>
              </div>
            </div>

            {order && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold text-slate-800">{order.customerName}</p>
                <p className="text-xs text-slate-500">Current status:</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-xs text-slate-500">Total Scans</p>
                <p className="font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2">
                <p className="text-xs text-emerald-700">Successful</p>
                <p className="font-bold text-emerald-700">{stats.success}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-2">
                <p className="text-xs text-rose-700">Failed</p>
                <p className="font-bold text-rose-700">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Recent Scans</h3>
            <div className="max-h-[430px] space-y-2 overflow-y-auto">
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
                      r.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-semibold text-slate-800">{r.id}</p>
                      <span className="text-[11px] text-slate-500">{r.scannedAt}</span>
                    </div>
                    <p className={clsx("text-xs", r.ok ? "text-emerald-700" : "text-rose-700")}>
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

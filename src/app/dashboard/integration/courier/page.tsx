"use client";

import { useState } from "react";
import { Truck, Key, CheckCircle2 } from "lucide-react";
import { COURIERS } from "@/lib/approved-orders-nav";
import clsx from "clsx";

export default function CourierIntegrationPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Courier Integration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect courier APIs for tracking, booking &amp; auto status updates
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {COURIERS.map((name) => {
          const isOn = connected[name];
          return (
            <div key={name} className="yai-panel p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{name}</h3>
                    <p className="text-xs text-slate-500">API + webhook</p>
                  </div>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    isOn
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isOn ? "Connected" : "Not connected"}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <Key className="h-4 w-4 text-slate-400" />
                  <input
                    placeholder="API key / token"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConnected((c) => ({ ...c, [name]: !c[name] }))
                  }
                  className={clsx(
                    "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white",
                    isOn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {isOn && <CheckCircle2 className="h-4 w-4" />}
                  {isOn ? "Connected" : `Connect ${name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

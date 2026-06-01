"use client";

import { Plug, Link2, Key, RefreshCw } from "lucide-react";

type Props = {
  title: string;
  description: string;
  brandColor: string;
  storePlaceholder?: string;
  connectLabel: string;
  syncOptions?: string[];
};

export function IntegrationConnectPanel({
  title,
  description,
  brandColor,
  storePlaceholder = "https://yourstore.com",
  connectLabel,
  syncOptions = [
    "Auto-import new orders",
    "Sync product inventory",
    "Update order status on store",
    "Webhook on order create",
  ],
}: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="yai-panel p-6">
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Plug className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Connection Status</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Not Connected
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Store URL" icon={Link2} placeholder={storePlaceholder} />
            <Field label="API Key" icon={Key} placeholder="pk_xxxxxxxx" />
            <Field label="API Secret" icon={Key} type="password" placeholder="sk_xxxxxxxx" />
            <button
              type="button"
              className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md hover:brightness-110"
              style={{ backgroundColor: brandColor }}
            >
              {connectLabel}
            </button>
          </div>
        </div>

        <div className="yai-panel p-6">
          <h3 className="mb-4 font-bold text-slate-800">Sync Options</h3>
          <div className="space-y-4">
            {syncOptions.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: typeof Link2;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <Icon className="h-4 w-4 text-slate-400" />
        <input
          type={type}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

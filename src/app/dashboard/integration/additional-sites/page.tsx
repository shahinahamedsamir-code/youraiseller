"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { mockSites } from "@/lib/mock-web-orders";
import { Plus, Globe, ExternalLink, Wifi, WifiOff } from "lucide-react";

export default function AdditionalSitesPage() {
  return (
    <div>
      <PageHeader
        title="Additional Sites"
        description="Manage multiple web storefronts connected to your account"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Site
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockSites.map((site) => (
          <div key={site.name} className="yai-panel p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <Globe className="h-6 w-6" />
              </div>
              {site.status === "connected" ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <Wifi className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  <WifiOff className="h-3 w-3" /> Offline
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900">{site.name}</h3>
            <a
              href={`https://${site.url}`}
              className="mt-1 flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              {site.url}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-4 text-2xl font-bold text-slate-800">
              {site.orders}{" "}
              <span className="text-sm font-normal text-slate-500">orders</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

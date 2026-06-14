"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Users,
  Building2,
  Plug,
  FileText,
  Sticker,
  PackagePlus,
  ScrollText,
  MessageSquareText,
  Trash2,
  SlidersHorizontal,
  Smartphone,
  Tag,
  ChevronRight,
  Sparkles,
  Save,
  Bell,
  Palette,
  ShieldCheck,
  Search,
} from "lucide-react";
import clsx from "clsx";
import { useFeatures } from "@/context/FeatureContext";
import type { FeatureKey } from "@/lib/features";

type SettingItem = {
  key: string;
  title: string;
  desc: string;
  icon: typeof Users;
  /** tailwind gradient + tint classes */
  from: string;
  to: string;
  ring: string;
  badge?: string;
  href?: string;
  /** when set, the card is hidden if this feature is disabled */
  featureKey?: FeatureKey;
};

type SettingGroup = {
  group: string;
  caption: string;
  items: SettingItem[];
};

const GROUPS: SettingGroup[] = [
  {
    group: "Business",
    caption: "Your company identity and people",
    items: [
      {
        key: "user-list",
        title: "User List",
        desc: "Manage team members and roles",
        icon: Users,
        from: "from-violet-500",
        to: "to-indigo-600",
        ring: "ring-violet-100",
        href: "/dashboard/settings/users",
        featureKey: "settings_users",
      },
      {
        key: "business-setting",
        title: "Business Setting",
        desc: "Name, mobile, address, logo & slug",
        icon: Building2,
        from: "from-sky-500",
        to: "to-blue-600",
        ring: "ring-sky-100",
        href: "/dashboard/settings/business",
        featureKey: "settings_business",
      },
      {
        key: "integrations",
        title: "Integrations",
        desc: "Connect couriers, stores & APIs",
        icon: Plug,
        from: "from-emerald-500",
        to: "to-teal-600",
        ring: "ring-emerald-100",
        href: "/dashboard/integration",
      },
    ],
  },
  {
    group: "Documents & Templates",
    caption: "Invoices, stickers and message formats",
    items: [
      {
        key: "select-invoice",
        title: "Select Invoice",
        desc: "Choose your invoice layout",
        icon: FileText,
        from: "from-amber-500",
        to: "to-orange-600",
        ring: "ring-amber-100",
        href: "/dashboard/settings/invoice",
        featureKey: "settings_invoice",
      },
      {
        key: "select-sticker",
        title: "Select Sticker",
        desc: "Pick parcel / shipping sticker style",
        icon: Sticker,
        from: "from-pink-500",
        to: "to-rose-600",
        ring: "ring-pink-100",
        href: "/dashboard/settings/sticker",
        featureKey: "settings_sticker",
      },
      {
        key: "shipping-note",
        title: "Shipping Note Template",
        desc: "Customise the note printed on parcels",
        icon: ScrollText,
        from: "from-fuchsia-500",
        to: "to-purple-600",
        ring: "ring-fuchsia-100",
        href: "/dashboard/settings/shipping-note",
        featureKey: "settings_shipping_note",
      },
      {
        key: "send-message",
        title: "Send Message Template",
        desc: "Templates for SMS & messenger replies",
        icon: MessageSquareText,
        from: "from-cyan-500",
        to: "to-sky-600",
        ring: "ring-cyan-100",
        href: "/dashboard/integration/sms/templates",
      },
    ],
  },
  {
    group: "Operations",
    caption: "Order flow and channel configuration",
    items: [
      {
        key: "new-order-source",
        title: "New Order Source",
        desc: "Add channels orders come from",
        icon: PackagePlus,
        from: "from-indigo-500",
        to: "to-violet-600",
        ring: "ring-indigo-100",
        href: "/dashboard/settings/order-source",
        featureKey: "settings_order_source",
      },
      {
        key: "order-tags",
        title: "Order Tags",
        desc: "Tags for New Order (Engraving, Scammer, etc.)",
        icon: Tag,
        from: "from-teal-500",
        to: "to-cyan-600",
        ring: "ring-teal-100",
        href: "/dashboard/settings/order-tags",
        featureKey: "settings_order_tags",
      },
      {
        key: "advance-setting",
        title: "Advance Setting",
        desc: "Fine-tune system behaviour",
        icon: SlidersHorizontal,
        from: "from-slate-500",
        to: "to-slate-700",
        ring: "ring-slate-200",
        href: "/dashboard/settings/advance",
        featureKey: "settings_advance",
      },
    ],
  },
  {
    group: "Security & Logs",
    caption: "Access control and audit history",
    items: [
      {
        key: "deletion-logs",
        title: "Deletion Logs",
        desc: "Track what was deleted and by whom",
        icon: Trash2,
        from: "from-rose-500",
        to: "to-red-600",
        ring: "ring-rose-100",
      },
      {
        key: "device-approvals",
        title: "Device Approvals",
        desc: "Approve devices that can log in",
        icon: Smartphone,
        from: "from-teal-500",
        to: "to-emerald-600",
        ring: "ring-teal-100",
      },
    ],
  },
];

const QUICK = [
  { key: "notifications", title: "Notifications", desc: "Email & in-app alerts", icon: Bell },
  { key: "appearance", title: "Appearance", desc: "Theme & branding", icon: Palette },
  {
    key: "security",
    title: "Security",
    desc: "Password & sign-in",
    icon: ShieldCheck,
    href: "/dashboard/settings/security",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { isEnabled } = useFeatures();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const openItem = (it: SettingItem) => {
    setActive(it.key);
    if (it.href) router.push(it.href);
  };

  const q = query.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (it) =>
        (!it.featureKey || isEnabled(it.featureKey)) &&
        (!q ||
          it.title.toLowerCase().includes(q) ||
          it.desc.toLowerCase().includes(q))
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-violet-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <SettingsIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                  <Sparkles className="h-3 w-3" />
                  Control center
                </span>
              </div>
              <p className="mt-1 text-sm text-white/80">
                System and account configuration in one place
              </p>
            </div>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/60 outline-none ring-0 backdrop-blur focus:border-white/40"
            />
          </div>
        </div>
      </div>

      {/* Groups */}
      {groups.map((g) => (
        <section key={g.group}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              {g.group}
            </h2>
            <span className="text-xs text-slate-400">{g.caption}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => openItem(it)}
                className={clsx(
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md",
                  it.ring,
                  active === it.key ? "border-violet-300" : "border-slate-100"
                )}
              >
                <div
                  className={clsx(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition group-hover:scale-105",
                    it.from,
                    it.to
                  )}
                >
                  <it.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-slate-800">{it.title}</h3>
                  <p className="truncate text-xs text-slate-500">{it.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">
            No settings match “{query}”.
          </p>
        </div>
      )}

      {/* General quick settings */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="yai-panel overflow-hidden lg:col-span-2">
          <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40 px-5 py-4">
            <h3 className="font-extrabold text-slate-900">General Settings</h3>
            <p className="text-xs text-slate-500">Quick company defaults</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Company Name
                </label>
                <input
                  type="text"
                  defaultValue="YourAI Seller"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Currency
                </label>
                <select className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100">
                  <option>BDT (৳)</option>
                  <option>USD ($)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:shadow-lg"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>

        <div className="yai-panel overflow-hidden">
          <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40 px-5 py-4">
            <h3 className="font-extrabold text-slate-900">Quick Access</h3>
            <p className="text-xs text-slate-500">Account preferences</p>
          </div>
          <div className="divide-y divide-slate-100">
            {QUICK.map((q2) => (
              <button
                key={q2.key}
                type="button"
                onClick={() => {
                  if ("href" in q2 && q2.href) router.push(q2.href);
                }}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-violet-50/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <q2.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{q2.title}</p>
                  <p className="truncate text-xs text-slate-500">{q2.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

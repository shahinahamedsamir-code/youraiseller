"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Save,
  Check,
  Phone,
  Mail,
  Globe,
  Share2,
  MapPin,
  Receipt,
  Truck,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  X,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  loadBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-store";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100";
const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500";

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Building2;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="yai-panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-violet-100/80 bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40 px-5 py-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function normalizeLogoUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function BusinessSettingsPanel() {
  const [s, setS] = useState<BusinessSettings | null>(null);
  const [toast, setToast] = useState("");
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const [logoUrlDraft, setLogoUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const logoUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setS(loadBusinessSettings());
    const onUpdate = () => setS(loadBusinessSettings());
    window.addEventListener("youraiseller-business-settings-updated", onUpdate);
    return () =>
      window.removeEventListener("youraiseller-business-settings-updated", onUpdate);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!s) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-slate-400">
        Loading business settings…
      </div>
    );
  }

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) =>
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onLogoFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setToast("Logo must be under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const onUseUrl = () => {
    setLogoUrlDraft(s.logoUrl || "");
    setShowLogoUrlInput(true);
    requestAnimationFrame(() => logoUrlInputRef.current?.focus());
  };

  const applyLogoUrl = () => {
    const normalized = normalizeLogoUrl(logoUrlDraft);
    if (!normalized) {
      setToast("Enter a valid image URL (https://…).");
      return;
    }
    set("logoUrl", normalized);
    setShowLogoUrlInput(false);
    setLogoUrlDraft("");
    setToast("Logo URL applied. Click Save Changes to keep it.");
  };

  const save = () => {
    const saved = saveBusinessSettings(s);
    setS(saved);
    setToast("Business settings saved.");
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-violet-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {s.name || "Business Setting"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                  <Sparkles className="h-3 w-3" />
                  Used on invoices
                </span>
              </div>
              <p className="mt-1 text-sm text-white/80">
                Your business identity, contact and invoice defaults
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-violet-700 shadow-md transition hover:shadow-lg"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Identity */}
      <Section icon={Building2} title="Identity" desc="Name, tagline and logo shown on invoices">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Business Name</label>
            <input className={inputCls} value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Turume" />
          </div>
          <div>
            <label className={labelCls}>Tagline / Slogan</label>
            <input className={inputCls} value={s.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Quality you can trust" />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>
            <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
            Business Logo
          </label>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
            <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="logo preview" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">No logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Change Logo
              </button>
              <button
                type="button"
                onClick={onUseUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LinkIcon className="h-4 w-4" />
                Use URL
              </button>
              {s.logoUrl && (
                <button
                  type="button"
                  onClick={() => set("logoUrl", "")}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogoFile(e.target.files?.[0])}
            />
          </div>
          {showLogoUrlInput && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-3">
              <input
                ref={logoUrlInputRef}
                type="url"
                value={logoUrlDraft}
                onChange={(e) => setLogoUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLogoUrl();
                  }
                  if (e.key === "Escape") {
                    setShowLogoUrlInput(false);
                    setLogoUrlDraft("");
                  }
                }}
                placeholder="https://example.com/logo.png"
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                onClick={applyLogoUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Check className="h-4 w-4" />
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoUrlInput(false);
                  setLogoUrlDraft("");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">PNG/JPG, under 1 MB. Shown on invoices & stickers.</p>
        </div>
      </Section>

      {/* Contact */}
      <Section icon={Phone} title="Contact" desc="How customers and couriers reach you">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}><Phone className="h-3.5 w-3.5 text-violet-500" />Business Mobile</label>
            <input className={inputCls} inputMode="numeric" value={s.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className={labelCls}><Phone className="h-3.5 w-3.5 text-violet-500" />Secondary Mobile</label>
            <input className={inputCls} inputMode="numeric" value={s.mobile2} onChange={(e) => set("mobile2", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}><MessageCircle className="h-3.5 w-3.5 text-emerald-500" />WhatsApp</label>
            <input className={inputCls} inputMode="numeric" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}><Mail className="h-3.5 w-3.5 text-violet-500" />Email</label>
            <input className={inputCls} value={s.email} onChange={(e) => set("email", e.target.value)} placeholder="business@example.com" />
          </div>
          <div>
            <label className={labelCls}><Globe className="h-3.5 w-3.5 text-violet-500" />Website</label>
            <input className={inputCls} value={s.website} onChange={(e) => set("website", e.target.value)} placeholder="https://yourstore.com" />
          </div>
          <div>
            <label className={labelCls}><Share2 className="h-3.5 w-3.5 text-blue-500" />Facebook Page</label>
            <input className={inputCls} value={s.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="facebook.com/yourpage" />
          </div>
        </div>
      </Section>

      {/* Address */}
      <Section icon={MapPin} title="Address" desc="Pickup / business address used on invoices">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>Business Address</label>
            <input className={inputCls} value={s.address} onChange={(e) => set("address", e.target.value)} placeholder="House, road, block" />
          </div>
          <div>
            <label className={labelCls}>Area</label>
            <input className={inputCls} value={s.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Nikunjo 2" />
          </div>
          <div>
            <label className={labelCls}>City / District</label>
            <input className={inputCls} value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Dhaka" />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input className={inputCls} value={s.country} onChange={(e) => set("country", e.target.value)} placeholder="Bangladesh" />
          </div>
        </div>
      </Section>

      {/* Invoice */}
      <Section icon={Receipt} title="Invoice" desc="Numbering, currency and footer on printed invoices">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Invoice Slug / Prefix</label>
            <input className={inputCls} value={s.invoiceSlug} onChange={(e) => set("invoiceSlug", e.target.value.toUpperCase())} placeholder="e.g. TURU" />
            <p className="mt-1 text-[10px] text-slate-400">Added before the invoice number. Letters & underscores.</p>
          </div>
          <div>
            <label className={labelCls}>Next Invoice Number</label>
            <input
              className={inputCls}
              inputMode="numeric"
              value={s.nextInvoiceNumber}
              onChange={(e) => set("nextInvoiceNumber", Number(e.target.value.replace(/\D/g, "")) || 0)}
              placeholder="1001"
            />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select className={inputCls} value={s.currency} onChange={(e) => set("currency", e.target.value === "USD" ? "USD" : "BDT")}>
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelCls}>Invoice Footer Note</label>
            <input className={inputCls} value={s.invoiceFooter} onChange={(e) => set("invoiceFooter", e.target.value)} placeholder="Thank you for your order!" />
          </div>
        </div>
        {s.invoiceSlug && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
            Preview: {s.invoiceSlug}-{s.nextInvoiceNumber}
          </div>
        )}
      </Section>

      {/* Order defaults */}
      <Section icon={Truck} title="Order Defaults" desc="Auto-filled values when creating new orders">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}><Truck className="h-3.5 w-3.5 text-violet-500" />Default Delivery Cost</label>
            <input
              className={inputCls}
              inputMode="numeric"
              value={s.defaultDeliveryCost}
              onChange={(e) => set("defaultDeliveryCost", Number(e.target.value.replace(/\D/g, "")) || 0)}
              placeholder="0"
            />
            <p className="mt-1 text-[10px] text-slate-400">Auto-added to new orders; you can change per order.</p>
          </div>
          <div>
            <label className={labelCls}>Default Order Note</label>
            <input className={inputCls} value={s.orderNote} onChange={(e) => set("orderNote", e.target.value)} placeholder="Optional note added to new orders" />
          </div>
        </div>
      </Section>

      {/* Sticky save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:shadow-lg"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}

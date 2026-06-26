"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  createDeliveryMethod,
  getDeliveryMethod,
  updateDeliveryMethod,
  DELIVERY_TYPE_LABELS,
  type DeliveryMethodType,
  type SteadfastConfig,
} from "@/lib/delivery-methods-store";
import { DEFAULT_STEADFAST_CONFIG } from "@/lib/steadfast-types";
import { DEFAULT_PATHAO_CONFIG } from "@/lib/pathao-types";
import { DEFAULT_CARRYBEE_CONFIG } from "@/lib/carrybee-types";
import { DEFAULT_REDX_CONFIG } from "@/lib/redx-types";
import { DEFAULT_PAPERFLY_CONFIG } from "@/lib/paperfly-types";
import { testSteadfastConnection } from "@/lib/steadfast-service";
import { PathaoDeliveryFields } from "@/components/delivery/PathaoDeliveryFields";
import { CarrybeeDeliveryFields } from "@/components/delivery/CarrybeeDeliveryFields";
import { RedxDeliveryFields } from "@/components/delivery/RedxDeliveryFields";
import { PaperflyDeliveryFields } from "@/components/delivery/PaperflyDeliveryFields";
import type { PathaoConfig } from "@/lib/pathao-types";
import type { CarrybeeConfig } from "@/lib/carrybee-types";
import type { RedxConfig } from "@/lib/redx-types";
import type { PaperflyConfig } from "@/lib/paperfly-types";
import {
  generateSteadfastWebhookSecret,
  getSteadfastWebhookPublicUrl,
  registerSteadfastWebhookWithServer,
} from "@/lib/steadfast-webhook-client";
import {
  generateCarrybeeWebhookSignature,
  registerCarrybeeWebhookWithServer,
} from "@/lib/carrybee-webhook-client";
import { getSessionUserId } from "@/lib/dev-users";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  PackagePlus,
  Settings2,
  Truck,
} from "lucide-react";

const types = Object.keys(DELIVERY_TYPE_LABELS) as DeliveryMethodType[];

const STEADFAST_DOC =
  "https://docs.google.com/document/d/e/2PACX-1vTi0sTyR353xu1AK0nR8E_WKe5onCkUXGEf8ch8uoJy9qxGfgGnboSIkNosjQ0OOdXkJhgGuAsWxnIh/pub";

const methodTypeHelp: Record<DeliveryMethodType, string> = {
  steadfast: "Auto consignment, status checks, balance and webhook support.",
  pathao: "Create orders through Pathao courier API with store selection.",
  carrybee: "Create Carrybee orders with store, address and webhook settings.",
  redx: "Create RedX parcels with pickup store, delivery area and tracking.",
  paperfly: "Create Paperfly orders, track reference numbers, cancel orders and receive webhooks.",
  ecourier: "Manual eCourier method for filtering and tracking entry.",
  others: "Manual courier, pickup or custom delivery workflow.",
};

function inputCls() {
  return "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
}

export function DeliveryMethodForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const existing = useMemo(
    () => (editId ? getDeliveryMethod(editId) : undefined),
    [editId]
  );

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<DeliveryMethodType>(existing?.type ?? "others");
  const [connectedBusiness, setConnectedBusiness] = useState(
    existing?.connectedBusiness ?? "Your Store"
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [preferred, setPreferred] = useState(existing?.preferred ?? false);
  const [codEnabled, setCodEnabled] = useState(existing?.codEnabled ?? true);

  const [sf, setSf] = useState<SteadfastConfig>(
    existing?.steadfast ?? { ...DEFAULT_STEADFAST_CONFIG }
  );
  const [pathao, setPathao] = useState<PathaoConfig>(
    existing?.pathao ?? { ...DEFAULT_PATHAO_CONFIG }
  );
  const [carrybee, setCarrybee] = useState<CarrybeeConfig>(
    existing?.carrybee ?? { ...DEFAULT_CARRYBEE_CONFIG }
  );
  const [redx, setRedx] = useState<RedxConfig>(
    existing?.redx ?? { ...DEFAULT_REDX_CONFIG }
  );
  const [paperfly, setPaperfly] = useState<PaperflyConfig>(
    existing?.paperfly ?? { ...DEFAULT_PAPERFLY_CONFIG }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSteadfast = type === "steadfast";
  const isPathao = type === "pathao";
  const isCarrybee = type === "carrybee";
  const isRedx = type === "redx";
  const isPaperfly = type === "paperfly";

  useEffect(() => {
    if (isSteadfast && !name.trim()) {
      setName("STEADFAST");
    }
    if (isPathao && !name.trim()) {
      setName("PATHAO");
    }
    if (isCarrybee && !name.trim()) {
      setName("CARRYBEE");
    }
    if (isRedx && !name.trim()) {
      setName("REDX");
    }
    if (isPaperfly && !name.trim()) {
      setName("PAPERFLY");
    }
  }, [isSteadfast, isPathao, isCarrybee, isRedx, isPaperfly, name]);

  useEffect(() => {
    if (isSteadfast && !sf.webhookSecret?.trim()) {
      setSf((prev) => ({
        ...prev,
        webhookSecret: generateSteadfastWebhookSecret(),
      }));
    }
  }, [isSteadfast, sf.webhookSecret]);

  useEffect(() => {
    if (!isCarrybee) return;
    setCarrybee((prev) => {
      if (prev.webhookSignature?.trim()) return prev;
      return {
        ...prev,
        webhookSignature: generateCarrybeeWebhookSignature(),
      };
    });
  }, [isCarrybee]);

  const webhookUrl = getSteadfastWebhookPublicUrl();

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${label} copied`);
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      setError(`Could not copy ${label}`);
    }
  };

  const runTest = async () => {
    setTestResult("");
    if (!sf.apiKey.trim() || !sf.apiSecret.trim()) {
      setTestResult("Enter Api-Key and Secret-Key first.");
      return;
    }
    setTesting(true);
    try {
      const r = await testSteadfastConnection(sf);
      setTestResult(
        r.ok
          ? `Connected · Balance ৳${(r.balance ?? 0).toLocaleString("en-BD")}`
          : r.message
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isSteadfast) {
      if (!sf.apiKey.trim() || !sf.apiSecret.trim()) {
        setError("Steadfast Api-Key and Api Secret are required.");
        return;
      }
    }
    if (isPathao) {
      if (
        !pathao.clientId.trim() ||
        !pathao.clientSecret.trim() ||
        !pathao.username.trim() ||
        !pathao.password
      ) {
        setError("Pathao Client ID, Secret, username and password are required.");
        return;
      }
      if (!pathao.storeId) {
        setError("Pathao Store ID is required. Run Test API & load stores.");
        return;
      }
    }
    if (isCarrybee) {
      if (
        !carrybee.clientId.trim() ||
        !carrybee.clientSecret.trim() ||
        !carrybee.clientContext.trim()
      ) {
        setError("Carrybee Client ID, Secret and Client Context are required.");
        return;
      }
      if (!carrybee.storeId.trim()) {
        setError("Carrybee Store ID is required. Run Test API & load stores.");
        return;
      }
    }
    if (isRedx) {
      if (!redx.accessToken.trim()) {
        setError("RedX API access token is required.");
        return;
      }
      if (!redx.pickupStoreId) {
        setError("RedX Pickup Store ID is required. Run Test API & load pickup stores.");
        return;
      }
      if (!redx.defaultDeliveryAreaId) {
        setError("RedX Delivery Area ID is required. Search/select an area first.");
        return;
      }
    }
    if (isPaperfly) {
      if (!paperfly.username.trim() || !paperfly.password || !paperfly.paperflyKey.trim()) {
        setError("Paperfly username, password and paperfly key are required.");
        return;
      }
      if (!paperfly.storeName.trim()) {
        setError("Paperfly Store Name is required.");
        return;
      }
    }

    try {
      const steadfastPayload = isSteadfast
        ? {
            ...sf,
            webhookSecret:
              sf.webhookSecret?.trim() || generateSteadfastWebhookSecret(),
          }
        : undefined;

      const pathaoPayload = isPathao
        ? {
            ...pathao,
            sendProductNames: pathao.sendProductNames,
          }
        : undefined;

      const carrybeePayload = isCarrybee
        ? {
            ...carrybee,
            webhookSignature:
              carrybee.webhookSignature?.trim() ||
              generateCarrybeeWebhookSignature(),
            sendProductNames: carrybee.sendProductNames,
        }
        : undefined;

      const redxPayload = isRedx
        ? {
            ...redx,
            sendProductNames: redx.sendProductNames,
          }
        : undefined;

      const paperflyPayload = isPaperfly
        ? {
            ...paperfly,
            sendProductNames: paperfly.sendProductNames,
          }
        : undefined;

      const payload = {
        name: name.trim(),
        type,
        connectedBusiness: connectedBusiness.trim() || "Your Store",
        active,
        preferred,
        codEnabled,
        steadfast: steadfastPayload,
        pathao: pathaoPayload,
        carrybee: carrybeePayload,
        redx: redxPayload,
        paperfly: paperflyPayload,
      };

      let methodId = editId ?? "";
      if (editId && existing) {
        updateDeliveryMethod(editId, payload);
        setSuccess("Delivery method updated!");
      } else {
        const created = createDeliveryMethod(payload);
        methodId = created.id;
        setSuccess("Delivery method created!");
      }

      const sellerId = getSessionUserId();
      if (sellerId && methodId) {
        if (isSteadfast && steadfastPayload?.webhookSecret) {
          const reg = await registerSteadfastWebhookWithServer({
            sellerId,
            methodId,
            webhookSecret: steadfastPayload.webhookSecret,
          });
          if (!reg.ok) {
            setError(reg.message ?? "Steadfast webhook register failed");
            return;
          }
        }
        if (isCarrybee && carrybeePayload?.webhookSignature) {
          const reg = await registerCarrybeeWebhookWithServer({
            sellerId,
            methodId,
            webhookSignature: carrybeePayload.webhookSignature,
          });
          if (!reg.ok) {
            setError(reg.message ?? "Carrybee webhook register failed");
            return;
          }
        }
      }

      setTimeout(() => router.push("/dashboard/delivery"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <form onSubmit={submit} className="max-w-5xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <PackagePlus className="h-6 w-6" />
            </span>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase text-indigo-500">
                <Settings2 className="h-3.5 w-3.5" />
                Courier setup
              </p>
              <h2 className="text-2xl font-extrabold text-slate-950">
                {editId ? "Edit delivery method" : "Add new delivery method"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Configure the method name, connected business, API credentials,
                parcel defaults, and visibility for order workflows.
              </p>
            </div>
          </div>
          <a
            href={STEADFAST_DOC}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
          >
            API docs
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
          <Building2 className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">
            Method identity
          </h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Delivery Method Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. REDX, PATHAO, STEADFAST TURUMART"
              className={inputCls()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Connected Business
            </label>
            <input
              value={connectedBusiness}
              onChange={(e) => setConnectedBusiness(e.target.value)}
              placeholder="e.g. Your Store"
              className={inputCls()}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                const t = e.target.value as DeliveryMethodType;
                setType(t);
                if (t === "steadfast") {
                  setSf((prev) => ({ ...DEFAULT_STEADFAST_CONFIG, ...prev }));
                }
                if (t === "pathao") {
                  setPathao((prev) => ({ ...DEFAULT_PATHAO_CONFIG, ...prev }));
                }
                if (t === "carrybee") {
                  setCarrybee((prev) => ({ ...DEFAULT_CARRYBEE_CONFIG, ...prev }));
                }
            if (t === "redx") {
              setRedx((prev) => ({ ...DEFAULT_REDX_CONFIG, ...prev }));
            }
            if (t === "paperfly") {
              setPaperfly((prev) => ({ ...DEFAULT_PAPERFLY_CONFIG, ...prev }));
            }
              }}
              className={inputCls()}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {DELIVERY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">
              {DELIVERY_TYPE_LABELS[type]} - {methodTypeHelp[type]}
            </p>
          </div>
        </div>
      </div>

      {isCarrybee && (
        <CarrybeeDeliveryFields
          config={carrybee}
          onChange={setCarrybee}
          active={active}
          onActiveChange={setActive}
          sendProductNames={carrybee.sendProductNames}
          onSendProductNamesChange={(v) =>
            setCarrybee((c) => ({ ...c, sendProductNames: v }))
          }
        />
      )}

      {isPathao && (
        <PathaoDeliveryFields
          config={pathao}
          onChange={setPathao}
          active={active}
          onActiveChange={setActive}
          sendProductNames={pathao.sendProductNames}
          onSendProductNamesChange={(v) =>
            setPathao((p) => ({ ...p, sendProductNames: v }))
          }
        />
      )}

      {isRedx && (
        <RedxDeliveryFields
          config={redx}
          onChange={setRedx}
          active={active}
          onActiveChange={setActive}
          sendProductNames={redx.sendProductNames}
          onSendProductNamesChange={(v) =>
            setRedx((r) => ({ ...r, sendProductNames: v }))
          }
        />
      )}

      {isPaperfly && (
        <PaperflyDeliveryFields
          config={paperfly}
          onChange={setPaperfly}
          active={active}
          onActiveChange={setActive}
          sendProductNames={paperfly.sendProductNames}
          onSendProductNamesChange={(v) =>
            setPaperfly((p) => ({ ...p, sendProductNames: v }))
          }
        />
      )}

      {isSteadfast && (
        <div className="space-y-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-extrabold text-slate-900">
              Steadfast Courier API
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Steadfast Api-Key
              </label>
              <input
                required
                value={sf.apiKey}
                onChange={(e) => setSf({ ...sf, apiKey: e.target.value })}
                placeholder="From Steadfast merchant dashboard"
                className={inputCls()}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Steadfast Secret-Key
              </label>
              <input
                required
                type="password"
                value={sf.apiSecret}
                onChange={(e) => setSf({ ...sf, apiSecret: e.target.value })}
                placeholder="Secret-Key header"
                className={inputCls()}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-600" />
              <h4 className="text-sm font-extrabold text-violet-950">
                STEADFAST Webhook Configuration
              </h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Webhook URL (Callback Url)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={webhookUrl}
                    className={clsx(inputCls(), "font-mono text-xs")}
                  />
                  <button
                    type="button"
                    onClick={() => copyText(webhookUrl, "Webhook URL")}
                    className="shrink-0 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Steadfast will POST status updates to this URL.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Auth Token (Bearer)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={sf.webhookSecret ?? ""}
                    className={clsx(inputCls(), "font-mono text-xs")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyText(sf.webhookSecret ?? "", "Auth Token")
                    }
                    className="shrink-0 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSf({
                        ...sf,
                        webhookSecret: generateSteadfastWebhookSecret(),
                      })
                    }
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    New
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Same value as Secret in Steadfast webhook form — save delivery
                  method after copying.
                </p>
              </div>
            </div>
            <a
              href="https://steadfast.com.bd/user/webhook/add"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
            >
              Open Steadfast Webhook Integration
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Steadfast has updated their system. Login credentials are{" "}
              <strong>optional</strong> but recommended so the system can check
              customer courier ratings when available.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Steadfast Account Email (Optional)
              </label>
              <input
                type="email"
                value={sf.accountEmail ?? ""}
                onChange={(e) =>
                  setSf({ ...sf, accountEmail: e.target.value })
                }
                placeholder="Portal login email"
                className={inputCls()}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Your Steadfast portal login email
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Steadfast Account Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={sf.accountPassword ?? ""}
                  onChange={(e) =>
                    setSf({ ...sf, accountPassword: e.target.value })
                  }
                  className={clsx(inputCls(), "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Your Steadfast portal login password
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Default Shipping Note
            </label>
            <textarea
              rows={3}
              value={sf.defaultShippingNote ?? ""}
              onChange={(e) =>
                setSf({ ...sf, defaultShippingNote: e.target.value })
              }
              placeholder="Sent to courier with every order (can change per order)"
              className={clsx(inputCls(), "resize-none")}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This note is sent to Steadfast as delivery instructions with each
              consignment.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Active</p>
                <p className="text-xs text-slate-500">
                  Show in New Order &amp; Order List filters
                </p>
              </div>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-5 w-10 accent-emerald-600"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Send Product Names to Courier
                </p>
                <p className="text-xs text-slate-500">
                  Item description on consignment; off = private
                </p>
              </div>
              <input
                type="checkbox"
                checked={sf.sendProductNames}
                onChange={(e) =>
                  setSf({ ...sf, sendProductNames: e.target.checked })
                }
                className="h-5 w-10 accent-emerald-600"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
          >
            Advanced Settings
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {advancedOpen && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Default Order Status (panel)
              </label>
              <select
                value={sf.defaultOrderStatus}
                onChange={(e) =>
                  setSf({
                    ...sf,
                    defaultOrderStatus: e.target.value as SteadfastConfig["defaultOrderStatus"],
                  })
                }
                className={inputCls()}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="in_review">In review (Steadfast)</option>
              </select>
              <p className="mt-2 text-[11px] text-slate-500">
                API: create order, check status, balance — see docs. Courier
                Management can auto-send RTS orders to Steadfast.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={testing}
            onClick={runTest}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            Test API connection
          </button>
          {testResult && (
            <p
              className={clsx(
                "text-sm font-semibold",
                testResult.startsWith("Connected")
                  ? "text-emerald-700"
                  : "text-rose-700"
              )}
            >
              {testResult}
            </p>
          )}
        </div>
      )}

      {!isSteadfast && !isPathao && !isCarrybee && !isRedx && !isPaperfly && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-600">
              Manual method settings
            </h3>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Active</p>
              <p className="text-xs text-slate-500">Show this method in order workflows</p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-10 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Preferred default</p>
              <p className="text-xs text-slate-500">Preselect this courier for new orders</p>
            </div>
            <input
              type="checkbox"
              checked={preferred}
              onChange={(e) => setPreferred(e.target.checked)}
              className="h-5 w-10 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">COD enabled</p>
              <p className="text-xs text-slate-500">Allow cash collection for this method</p>
            </div>
            <input
              type="checkbox"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="h-5 w-10 accent-indigo-600"
            />
          </label>
        </div>
      )}

      {(isSteadfast || isPathao || isCarrybee || isRedx || isPaperfly) && (
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-extrabold text-slate-800">Preferred default courier</p>
            <p className="text-xs text-slate-500">Use this API method as the first choice in new orders</p>
          </div>
          <input
            type="checkbox"
            checked={preferred}
            onChange={(e) => setPreferred(e.target.checked)}
            className="h-5 w-10 accent-indigo-600"
          />
        </label>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/dashboard/delivery")}
          className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-extrabold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700"
        >
          {editId ? "Save Changes" : "Create"}
        </button>
      </div>
    </form>
  );
}

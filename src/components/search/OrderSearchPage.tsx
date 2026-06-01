"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ClipboardList,
  Store,
  Phone,
  FileText,
  Sparkles,
  ArrowRight,
  HelpCircle,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import { loadOrders, type Order } from "@/lib/orders-store";
import {
  type SearchFieldMode,
  partitionSearchResults,
  getOrderSearchStatusLabel,
  getWebsiteOrderPlacement,
  websiteOrdersForCustomerPhone,
} from "@/lib/order-search";
import { isWebSourceOrder } from "@/lib/web-order-queue";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";
import { getProductImageForLine } from "@/lib/inventory-store";
const TABS: { key: SearchFieldMode; label: string; icon: typeof Search }[] = [
  { key: "all", label: "All Fields", icon: Search },
  { key: "invoice", label: "Invoice", icon: FileText },
  { key: "mobile", label: "Mobile Number", icon: Phone },
];

const PLACEHOLDERS: Record<SearchFieldMode, string> = {
  all: "Invoice, phone, customer name, courier ID, SKU, product…",
  invoice: "Order ID · WooCommerce # · Tracking number",
  mobile: "01XXXXXXXXX — phone number only",
};

function useDebounced(value: string, ms = 280): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function OrderSearchPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchFieldMode>("all");
  const [input, setInput] = useState("");
  const [active, setActive] = useState(false);
  const [tick, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  const debounced = useDebounced(input.trim());
  const searching = debounced.length > 0;

  useEffect(() => {
    const onData = () => setTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, []);

  const partition = useMemo(() => {
    void tick;
    if (!debounced) {
      return {
        approved: [] as Order[],
        websiteOrders: [] as Order[],
        websiteOnWebList: 0,
        websiteApproved: 0,
        total: 0,
      };
    }
    return partitionSearchResults(loadOrders(), debounced, mode);
  }, [debounced, mode, tick]);

  const customerWebInsight = useMemo(() => {
    void tick;
    if (!debounced) return null;
    const seed =
      partition.websiteOrders[0] ?? partition.approved[0];
    if (!seed) return null;
    return websiteOrdersForCustomerPhone(loadOrders(), seed.phone);
  }, [debounced, partition, tick]);

  const runSearch = useCallback(() => {
    setActive(true);
    startTransition(() => {});
  }, []);

  useEffect(() => {
    if (debounced) setActive(true);
    else setActive(false);
  }, [debounced]);

  const clear = () => {
    setInput("");
    setActive(false);
  };

  const openApproved = (id: string) => {
    router.push(`/dashboard/orders/approved/edit/${encodeURIComponent(id)}`);
  };

  const openWebsiteOrder = (o: Order) => {
    if (getWebsiteOrderPlacement(o) === "web_queue") {
      router.push(`/dashboard/orders/web/view/${encodeURIComponent(o.id)}`);
    } else {
      openApproved(o.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero search */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-600 p-6 shadow-xl shadow-indigo-500/20 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-teal-300/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-100">
              <Sparkles className="h-4 w-4" />
              Global order search
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Search Orders
            </h1>
            <p className="mt-1 max-w-xl text-sm text-indigo-100/90">
              Invoice, phone, customer, courier ID, SKU — results update as you
              type
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
            title="Search tips"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How to use search?
          </button>
        </div>

        {/* Tabs */}
        <div className="relative mt-6 flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition sm:text-sm",
                mode === t.key
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white/90 hover:bg-white/10"
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div
          className={clsx(
            "relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch",
            active && searching && "animate-[pulse_2s_ease-in-out_1]"
          )}
        >
          <div
            className={clsx(
              "flex min-h-[56px] flex-1 items-center gap-3 rounded-2xl bg-white px-4 shadow-lg transition ring-4",
              active && searching
                ? "ring-teal-300/50"
                : "ring-white/30 focus-within:ring-teal-200"
            )}
          >
            <Search
              className={clsx(
                "h-6 w-6 shrink-0 transition",
                pending ? "animate-pulse text-violet-500" : "text-indigo-500"
              )}
            />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
                if (e.key === "Escape") clear();
              }}
              placeholder={PLACEHOLDERS[mode]}
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={clear}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={!input.trim()}
            className="group flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-white px-8 text-base font-extrabold text-indigo-700 shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:opacity-50 sm:min-w-[160px]"
          >
            Search
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {searching && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            icon={Store}
            title="Website / WooCommerce"
            count={partition.websiteOrders.length}
            sub={
              partition.websiteOrders.length > 0
                ? `${partition.websiteOnWebList} on web list · ${partition.websiteApproved} approved`
                : undefined
            }
            tone="teal"
            loading={pending}
          />
          <SummaryCard
            icon={ClipboardList}
            title="Approved Orders"
            count={partition.approved.length}
            sub={
              partition.approved.some((o) => isWebSourceOrder(o))
                ? `${partition.approved.filter((o) => isWebSourceOrder(o)).length} from website`
                : undefined
            }
            tone="indigo"
            loading={pending}
          />
        </div>
      )}

      {searching && customerWebInsight && customerWebInsight.total > 0 && (
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/80 px-5 py-4">
          <p className="text-sm font-extrabold text-teal-900">
            Website orders for this customer
          </p>
          <p className="mt-1 text-sm text-teal-800">
            <strong>{customerWebInsight.total}</strong> order
            {customerWebInsight.total === 1 ? "" : "s"} from WooCommerce / website
            {customerWebInsight.onWebList > 0 && (
              <>
                {" "}
                · <strong>{customerWebInsight.onWebList}</strong> still on Web
                Order List
              </>
            )}
            {customerWebInsight.approved > 0 && (
              <>
                {" "}
                · <strong>{customerWebInsight.approved}</strong> moved to
                Approved (Create Order done)
              </>
            )}
          </p>
        </div>
      )}

      {/* Results */}
      {searching ? (
        <div className="space-y-8">
          <ResultSection
            title="Website / WooCommerce orders"
            count={partition.websiteOrders.length}
            query={debounced}
            emptyLabel="website or WooCommerce orders"
            hint="All orders that came from your store — including after Create Order"
          >
            {partition.websiteOrders.map((o) => (
              <WebsiteResultRow
                key={`web-${o.id}`}
                order={o}
                onOpen={() => openWebsiteOrder(o)}
              />
            ))}
          </ResultSection>

          <ResultSection
            title="Approved Orders"
            count={partition.approved.length}
            query={debounced}
            emptyLabel="approved orders"
            hint="Includes website orders after you clicked Create Order"
          >
            {partition.approved.map((o) => (
              <ApprovedResultRow
                key={`ap-${o.id}`}
                order={o}
                onOpen={() => openApproved(o.id)}
              />
            ))}
          </ResultSection>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-teal-100">
            <Search className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-800">
            Start typing to search
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try a phone number, invoice ID, or customer name — switch tabs to
            narrow the field
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  count,
  sub,
  tone,
  loading,
}: {
  icon: typeof ClipboardList;
  title: string;
  count: number;
  sub?: string;
  tone: "indigo" | "teal";
  loading?: boolean;
}) {
  const found = count > 0;
  return (
    <div
      className={clsx(
        "flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition",
        tone === "indigo" ? "border-indigo-100" : "border-teal-100",
        found && (tone === "indigo" ? "ring-2 ring-indigo-100" : "ring-2 ring-teal-100")
      )}
    >
      <div
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          tone === "indigo" ? "bg-indigo-100 text-indigo-600" : "bg-teal-100 text-teal-600"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p
          className={clsx(
            "text-2xl font-extrabold tabular-nums transition",
            loading && "opacity-60",
            found
              ? tone === "indigo"
                ? "text-indigo-700"
                : "text-teal-700"
              : "text-slate-400"
          )}
        >
          {found ? `${count} found` : "No matches"}
        </p>
        {sub && found && (
          <p className="text-[11px] font-semibold text-slate-500">{sub}</p>
        )}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  count,
  query,
  emptyLabel,
  hint,
  children,
}: {
  title: string;
  count: number;
  query: string;
  emptyLabel: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="yai-panel overflow-hidden rounded-2xl">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 className="text-sm font-extrabold text-slate-800">
          {title}{" "}
          <span className="font-bold text-indigo-600">— {count}</span>
        </h2>
        {hint && (
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{hint}</p>
        )}
      </div>
      {count === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          No {emptyLabel} found for &ldquo;
          <span className="font-semibold text-slate-700">{query}</span>
          &rdquo;
        </p>
      ) : (
        <div className="divide-y divide-slate-50">{children}</div>
      )}
    </section>
  );
}

function ApprovedResultRow({
  order: o,
  onOpen,
}: {
  order: Order;
  onOpen: () => void;
}) {
  const first = o.items[0];
  const img = first ? getProductImageForLine(first) : undefined;
  const fromWebsite = isWebSourceOrder(o);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-wrap items-center gap-4 px-4 py-4 text-left transition hover:bg-indigo-50/50"
    >
      <div className="min-w-[100px]">
        <p className="text-[10px] text-slate-500">{o.createdAt.split(",")[0]}</p>
        <p className="font-extrabold text-indigo-700">{o.id}</p>
        {fromWebsite && (
          <p className="mt-1 text-[10px] font-bold text-teal-700">
            From website → Approved
          </p>
        )}
      </div>
      <div className="min-w-[140px] flex-1">
        <p className="font-semibold text-slate-900">{o.customerName}</p>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Phone className="h-3 w-3" />
          {o.phone}
          <a
            href={`https://wa.me/88${o.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-emerald-600 hover:text-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
      <div className="hidden min-w-[120px] sm:block">
        <p className="text-xs text-slate-500">{o.courier}</p>
        <p className="line-clamp-1 text-xs text-slate-600">{o.district}</p>
      </div>
      <div className="flex min-w-[160px] items-center gap-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
          />
        ) : null}
        <p className="line-clamp-2 text-xs text-slate-700">
          {first?.productName ?? "—"}
          {o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {fromWebsite && <OrderSourceBadge order={o} />}
        <OrderStatusBadge status={o.status} />
      </div>
      <p className="font-extrabold text-slate-900">৳{o.total.toLocaleString()}</p>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
        Open <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function WebsiteResultRow({ order: o, onOpen }: { order: Order; onOpen: () => void }) {
  const first = o.items[0];
  const statusLabel = getOrderSearchStatusLabel(o);
  const placement = getWebsiteOrderPlacement(o);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-wrap items-center gap-4 px-4 py-4 text-left transition hover:bg-teal-50/50"
    >
      <div className="min-w-[130px]">
        <p className="text-[10px] text-slate-500">{o.createdAt.split(",")[0]}</p>
        <p className="font-extrabold text-teal-800">{o.id}</p>
        {o.wooNumber && (
          <p className="text-[10px] font-semibold text-slate-500">
            Woo #{o.wooNumber}
          </p>
        )}
      </div>
      <div className="min-w-[140px] flex-1">
        <p className="font-semibold text-slate-900">{o.customerName}</p>
        <p className="text-xs text-slate-500">{o.phone}</p>
      </div>
      <OrderSourceBadge order={o} />
      <span
        className={clsx(
          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
          placement === "web_queue"
            ? "bg-amber-100 text-amber-800"
            : "bg-indigo-100 text-indigo-800"
        )}
      >
        {placement === "web_queue" ? "On Web List" : "Approved"}
      </span>
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold capitalize text-emerald-800">
        {statusLabel}
      </span>
      <p className="line-clamp-1 max-w-[180px] text-xs text-slate-600">
        {first?.productName ?? "—"}
      </p>
      <p className="font-extrabold text-slate-900">৳{o.total.toLocaleString()}</p>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600">
        Open <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

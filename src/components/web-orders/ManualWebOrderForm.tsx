"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import {
  buildLineFromProduct,
  createOrder,
  findOrdersByPhone,
  loadProducts,
  type OrderLine,
  type PaymentMethod,
} from "@/lib/orders-store";
import { getProductImageForLine } from "@/lib/inventory-store";
import { getInitialDeliveryMethodId } from "@/lib/delivery-methods-store";
import { DeliveryMethodSelect } from "@/components/delivery/DeliveryMethodSelect";
import { BD_DISTRICTS } from "@/lib/approved-orders-nav";
import { WEB_DEFAULT_ORDER_SOURCE } from "@/lib/order-source";
import { getSessionUser } from "@/lib/dev-users";

const WEB_LIST = "/dashboard/orders/web";

const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: "cod", label: "COD" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "prepaid", label: "Prepaid" },
];

type CartLine = OrderLine & { imageDataUrl?: string };

function fieldCls() {
  return "w-full rounded-2xl border-0 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-inner ring-1 ring-slate-200/80 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/60 outline-none";
}

export function ManualWebOrderForm() {
  const router = useRouter();
  const products = useMemo(
    () => loadProducts().filter((p) => p.active !== false),
    []
  );
  const [deliveryMethodId, setDeliveryMethodId] = useState(
    () => getInitialDeliveryMethodId()
  );
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [shippingCharge, setShippingCharge] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 24);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [products, search]);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const ship = Math.max(0, parseFloat(shippingCharge) || 0);
  const disc = Math.max(0, parseFloat(discount) || 0);
  const total = Math.max(0, subtotal + ship - disc);

  const priorOrders = phone.trim().length >= 10 ? findOrdersByPhone(phone) : [];

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setError("");
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        const built = buildLineFromProduct(productId, prev[idx].qty + 1);
        if (!built) return prev;
        return prev.map((l, i) =>
          i === idx
            ? { ...built, imageDataUrl: product.imageDataUrl }
            : l
        );
      }
      const built = buildLineFromProduct(productId, 1);
      if (!built) return prev;
      return [...prev, { ...built, imageDataUrl: product.imageDataUrl }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const qty = l.qty + delta;
          if (qty <= 0) return null;
          const built = buildLineFromProduct(productId, qty, l.price);
          return built ? { ...built, imageDataUrl: l.imageDataUrl } : l;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const submit = () => {
    setError("");
    setSuccessId(null);
    if (!customerName.trim() || !phone.trim()) {
      setError("Customer name and phone are required.");
      return;
    }
    if (!address.trim()) {
      setError("Delivery address is required.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product to the cart.");
      return;
    }

    setSaving(true);
    try {
      const order = createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        district,
        paymentMethod,
        deliveryMethodId,
        items: lines,
        shippingCharge: ship,
        discount: disc,
        advance: 0,
        note: note.trim() || undefined,
        source: "web",
        webStatus: "processing",
        inWebQueue: true,
        webQueueReleased: false,
        handledBy: getSessionUser()?.name ?? "Staff",
        orderSource: WEB_DEFAULT_ORDER_SOURCE,
        tags: ["Manual Web", "Website"],
        status: "pending",
      });
      setSuccessId(order.id);
      setTimeout(() => router.push(WEB_LIST), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-3xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 18%, rgba(251,191,36,0.45) 0%, transparent 42%),
            radial-gradient(circle at 88% 8%, rgba(244,114,182,0.28) 0%, transparent 38%),
            radial-gradient(circle at 70% 90%, rgba(56,189,248,0.22) 0%, transparent 45%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative mx-auto max-w-6xl px-3 pb-10 pt-2 sm:px-4 lg:px-2">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
          <div>
            <p className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
              <ShoppingBag className="h-3.5 w-3.5" />
              Web intake
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Manual Web Order
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push(WEB_LIST)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white sm:px-4 sm:py-2.5"
          >
            View Web List
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4 sm:space-y-5">
            <section className="rounded-2xl border border-slate-200/80 bg-slate-900 p-4 text-white shadow-xl sm:rounded-3xl sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 1 — Customer
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <User className="h-3.5 w-3.5" /> Name
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className={fieldCls()}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className={fieldCls()}
                  />
                  {priorOrders.length > 0 && (
                    <p className="mt-1 text-[10px] text-amber-300">
                      {priorOrders.length} previous order(s) on this phone
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="House, road, area"
                  className={clsx(fieldCls(), "resize-none")}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                    District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={fieldCls()}
                  >
                    {BD_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                    Courier
                  </label>
                  <DeliveryMethodSelect
                    value={deliveryMethodId}
                    onChange={setDeliveryMethodId}
                    className={fieldCls()}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur-md sm:rounded-3xl sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Step 2 — Products
              </p>
              <div className="relative mt-3">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or SKU…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div className="mt-3 grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto sm:max-h-[220px] sm:grid-cols-3">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="flex flex-col items-start rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/80"
                  >
                    <span className="line-clamp-2 text-xs font-bold text-slate-800">
                      {p.name}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-500">{p.code}</span>
                    <span className="mt-2 text-sm font-extrabold text-amber-700">
                      ৳{p.sellPrice.toLocaleString("en-BD")}
                    </span>
                  </button>
                ))}
              </div>

              {lines.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  {lines.map((line) => {
                    const img = getProductImageForLine(line);
                    return (
                      <li
                        key={line.productId}
                        className="flex items-center gap-3 rounded-2xl bg-slate-900/5 p-3"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {line.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            ৳{line.price.toLocaleString("en-BD")} × {line.qty}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => changeQty(line.productId, -1)}
                            className="rounded-lg bg-white p-1.5 shadow ring-1 ring-slate-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQty(line.productId, 1)}
                            className="rounded-lg bg-white p-1.5 shadow ring-1 ring-slate-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.filter((l) => l.productId !== line.productId)
                            )
                          }
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order summary
              </p>
              <p className="mt-3 text-3xl font-black tabular-nums text-slate-900 sm:mt-4 sm:text-4xl">
                ৳{total.toLocaleString("en-BD")}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-slate-800">
                    ৳{subtotal.toLocaleString("en-BD")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Shipping</dt>
                  <dd>
                    <input
                      type="number"
                      min={0}
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-right text-sm font-semibold"
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Discount</dt>
                  <dd>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-right text-sm font-semibold"
                    />
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Payment
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENTS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPaymentMethod(p.value)}
                      className={clsx(
                        "rounded-xl px-3 py-1.5 text-xs font-bold",
                        paymentMethod === p.value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Note (optional)"
                className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />

              {error && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {error}
                </p>
              )}
              {successId && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {successId} → Web Order List
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {saving ? "Saving…" : "Add to Web Order List"}
              </button>
              <p className="mt-3 text-center text-[10px] text-slate-400">
                Status: Processing · Queue: Web List
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

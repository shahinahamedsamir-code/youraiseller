"use client";

import {
  Wallet,
  Smartphone,
  Banknote,
  Building2,
  Rocket,
  User,
  FileText,
  Hash,
} from "lucide-react";
import {
  ADVANCE_PAYMENT_LABELS,
  type AdvancePaymentMethod,
} from "@/lib/orders-store";
import clsx from "clsx";

const METHODS: {
  id: AdvancePaymentMethod;
  icon: typeof Smartphone;
  hint: string;
  color: string;
  activeRing: string;
}[] = [
  {
    id: "bkash",
    icon: Smartphone,
    hint: "Mobile wallet",
    color: "from-rose-500 to-pink-600",
    activeRing: "ring-rose-400",
  },
  {
    id: "nagad",
    icon: Smartphone,
    hint: "Mobile wallet",
    color: "from-orange-500 to-amber-600",
    activeRing: "ring-orange-400",
  },
  {
    id: "rocket",
    icon: Rocket,
    hint: "Dutch-Bangla",
    color: "from-violet-500 to-purple-600",
    activeRing: "ring-violet-400",
  },
  {
    id: "hand_cash",
    icon: Banknote,
    hint: "Cash in hand",
    color: "from-emerald-500 to-teal-600",
    activeRing: "ring-emerald-400",
  },
  {
    id: "bank",
    icon: Building2,
    hint: "Bank transfer",
    color: "from-slate-600 to-slate-800",
    activeRing: "ring-slate-400",
  },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

type Props = {
  amount: number;
  method: AdvancePaymentMethod;
  onMethodChange: (m: AdvancePaymentMethod) => void;
  transactionId: string;
  onTransactionIdChange: (v: string) => void;
  cashReceiverName: string;
  onCashReceiverNameChange: (v: string) => void;
  cashReference: string;
  onCashReferenceChange: (v: string) => void;
};

export function AdvancePaymentPanel({
  amount,
  method,
  onMethodChange,
  transactionId,
  onTransactionIdChange,
  cashReceiverName,
  onCashReceiverNameChange,
  cashReference,
  onCashReferenceChange,
}: Props) {
  const isHandCash = method === "hand_cash";

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 shadow-sm ring-1 ring-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100/80 bg-amber-100/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200/60">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-amber-950">
              Advance payment
            </p>
            <p className="text-xs text-amber-800/80">
              How did the customer pay this advance?
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-amber-200/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Amount
          </p>
          <p className="text-lg font-extrabold text-amber-950">
            ৳{amount.toLocaleString("en-BD")}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            1. Choose payment method
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {METHODS.map(({ id, icon: Icon, hint, color, activeRing }) => {
              const active = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onMethodChange(id)}
                  className={clsx(
                    "group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3.5 text-center transition",
                    active
                      ? `border-transparent bg-white shadow-md ring-2 ${activeRing}`
                      : "border-slate-100 bg-white/70 hover:border-amber-200 hover:bg-white hover:shadow-sm"
                  )}
                >
                  <div
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm transition",
                      color,
                      !active && "opacity-80 group-hover:opacity-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={clsx(
                      "text-xs font-bold leading-tight",
                      active ? "text-slate-900" : "text-slate-600"
                    )}
                  >
                    {ADVANCE_PAYMENT_LABELS[id]}
                  </span>
                  <span className="text-[10px] text-slate-400">{hint}</span>
                  {active && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/90 p-4 shadow-inner">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-extrabold text-indigo-700">
              2
            </span>
            {isHandCash ? "Cash received by" : "Payment proof"}
          </p>

          {isHandCash ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  Receiver name
                </label>
                <input
                  value={cashReceiverName}
                  onChange={(e) => onCashReceiverNameChange(e.target.value)}
                  placeholder="e.g. Rahim / Office cashier"
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Reference
                </label>
                <input
                  value={cashReference}
                  onChange={(e) => onCashReferenceChange(e.target.value)}
                  placeholder="Receipt no. or short note"
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Hash className="h-3.5 w-3.5 text-indigo-600" />
                Transaction ID
                <span className="font-normal text-slate-400">
                  ({ADVANCE_PAYMENT_LABELS[method]})
                </span>
              </label>
              <input
                value={transactionId}
                onChange={(e) => onTransactionIdChange(e.target.value)}
                placeholder="Paste trx ID from SMS or app"
                className={clsx(inputCls, "font-mono text-base tracking-wide")}
                autoComplete="off"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Copy the ID from {ADVANCE_PAYMENT_LABELS[method]} confirmation message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

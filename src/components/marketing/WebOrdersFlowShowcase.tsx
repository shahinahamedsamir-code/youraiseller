"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  MessageSquareText,
  PhoneCall,
  ShoppingCart,
} from "lucide-react";
import type { MarketingLanguage } from "@/lib/marketing-language";

type FlowStep = {
  title: string;
  step: string;
  from: string;
  to: string;
  label: string;
  description: string;
  status: string;
};

type FlowCopy = {
  stepByStep: string;
  title: string;
  orderPath: string;
  sourceToApproval: string;
  sourceSubtitle: string;
  thenNext: string;
  orderList: string;
  autoSms: string;
  autoCall: string;
  approvedOrders: string;
  summary: string;
  reminder: string;
  steps: FlowStep[];
};

const ORDER_SOURCES = [
  {
    name: "Shopify",
    tone: "from-emerald-500/25 to-emerald-500/10",
    ring: "ring-emerald-400/25",
    mark: "S",
  },
  {
    name: "WooCommerce",
    tone: "from-sky-500/25 to-sky-500/10",
    ring: "ring-sky-400/25",
    mark: "W",
  },
];

const FLOW_COPY: FlowCopy = {
    stepByStep: "Step by step flow",
    title: "From store order to approved shipment",
    orderPath: "Order path",
    sourceToApproval: "Source to approval",
    sourceSubtitle: "Source store",
    thenNext: "Then next",
    orderList: "Web Order List",
    autoSms: "Auto SMS",
    autoCall: "Auto Call",
    approvedOrders: "Approved Orders",
    summary:
      "Orders come from Shopify or WooCommerce, then move to Web Order List, then Auto SMS, then Auto Call, and finally into Approved Orders.",
    reminder:
      "Orders arrive from Shopify or WooCommerce, move to Web Order List, get SMS and call confirmation, and only then continue to Approved Orders for packing and courier.",
    steps: [
      {
        title: "1. Web Order List",
        step: "Step 1",
        from: "WooCommerce / Shopify",
        to: "Web Order List",
        label: "Starts here",
        description:
          "WooCommerce or Shopify orders land in Web Order List first, so your team can verify the incoming queue.",
        status: "New web order landed",
      },
      {
        title: "2. Auto SMS",
        step: "Step 2",
        from: "Web Order List",
        to: "Auto SMS",
        label: "Instant follow-up",
        description:
          "The customer receives a branded SMS immediately, so they know the order is being processed.",
        status: "SMS sent automatically",
      },
      {
        title: "3. Auto Call Center",
        step: "Step 3",
        from: "Auto SMS",
        to: "Auto Call Center",
        label: "Confirm the buyer",
        description:
          "A call goes out for confirmation. Real buyers continue, while suspicious orders can be stopped.",
        status: "Auto call ringing now",
      },
      {
        title: "4. Approved Orders",
        step: "Step 4",
        from: "Auto Call Center",
        to: "Approved Orders",
        label: "Ready to ship",
        description:
          "Confirmed orders move into Approved Orders, where packing, courier booking and dispatch begin.",
        status: "Approved and ready to pack",
      },
    ],
};

const STATUS_LINES = [
  "Web order #1042 landed from Shopify",
  "Auto SMS sent to 01XXXXXXXXX",
  "Auto call in progress for buyer confirmation",
  "Order moved to Approved Orders",
];

export function WebOrdersFlowShowcase({
  appHost = "localhost",
  language = "english",
}: {
  appHost?: string;
  language?: MarketingLanguage;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeStatus, setActiveStatus] = useState(0);
  const copy = FLOW_COPY;

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % copy.steps.length);
      setActiveStatus((current) => (current + 1) % STATUS_LINES.length);
    }, 1000);

    return () => window.clearInterval(id);
  }, [copy.steps.length]);

  return (
    <div className="space-y-4">
      <div className="marketing-live-panel mkt-card overflow-hidden rounded-[2rem] border border-white/8 bg-slate-950/40 p-4 shadow-2xl shadow-violet-950/20 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.22em]">
              {copy.stepByStep}
            </p>
            <h3 className="mkt-text mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              {copy.title}
            </h3>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300 ring-1 ring-cyan-400/20">
            {copy.orderPath}
          </span>
        </div>

        <div className="mb-4 rounded-[1.5rem] border border-white/8 bg-slate-950/50 p-4 sm:p-5">
          <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.2em]">
            {copy.sourceToApproval}
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {ORDER_SOURCES.map((source) => (
                <div
                  key={source.name}
                  className={clsx(
                    "flex items-center gap-3 rounded-2xl border border-white/8 bg-gradient-to-br px-4 py-3.5",
                    source.tone,
                    source.ring
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-lg font-black text-white shadow-inner ring-1 ring-white/10">
                    {source.mark}
                  </div>
                  <div className="min-w-0">
                    <p className="mkt-text text-sm font-bold">{source.name}</p>
                    <p className="mkt-text-subtle text-[11px] font-semibold uppercase tracking-[0.16em]">
                      {copy.sourceSubtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-px flex-1 bg-white/10" />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                {copy.thenNext}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: copy.orderList, tone: "border-sky-400/25 bg-sky-500/10 text-sky-200" },
                { label: copy.autoSms, tone: "border-teal-400/25 bg-teal-500/10 text-teal-200" },
                { label: copy.autoCall, tone: "border-violet-400/25 bg-violet-500/10 text-violet-200" },
                {
                  label: copy.approvedOrders,
                  tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
                },
              ].map((item) => (
                <div key={item.label} className={clsx("rounded-2xl border px-4 py-3 text-center", item.tone)}>
                  <p className="mkt-text text-sm font-bold">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mkt-text-muted mt-3 text-sm leading-relaxed">{copy.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {copy.steps.map((step, index) => {
            const Icon = [ShoppingCart, MessageSquareText, PhoneCall, CheckCircle2][index];
            const active = index === activeStep;
            return (
              <div
                key={step.title}
                className={clsx(
                  "marketing-live-card group rounded-[1.5rem] border p-4 transition duration-500",
                  "bg-gradient-to-br",
                  index === 0
                    ? "from-cyan-500/20 to-cyan-500/5"
                    : index === 1
                      ? "from-teal-500/20 to-teal-500/5"
                      : index === 2
                        ? "from-violet-500/20 to-violet-500/5"
                        : "from-emerald-500/20 to-emerald-500/5",
                  active
                    ? "border-cyan-400/40 opacity-100 shadow-lg shadow-cyan-500/10"
                    : "border-white/8 opacity-70 hover:border-white/15"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition duration-500",
                        active && "scale-105 bg-white/15"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.18em]">
                        {step.step}
                      </p>
                      <p className="mkt-text mt-1 text-sm font-bold sm:text-base">{step.title}</p>
                      <p className="mkt-text-subtle mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {step.label}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={clsx(
                      "h-4 w-4 shrink-0 transition duration-500",
                      active ? "translate-x-0 text-cyan-300" : "text-white/35 group-hover:translate-x-0.5"
                    )}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  <span className="rounded-full bg-white/8 px-2.5 py-1">{step.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white/35" />
                  <span className="rounded-full bg-white/8 px-2.5 py-1">{step.to}</span>
                </div>

                <p className="mkt-text-muted mt-3 text-sm leading-relaxed">{step.description}</p>

                <div className="mt-4">
                  <div className="mkt-progress-track h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={clsx(
                        "marketing-live-bar h-full rounded-full transition-all duration-700 ease-out",
                        index === 0
                          ? "bg-gradient-to-r from-cyan-500 to-sky-400"
                          : index === 1
                            ? "bg-gradient-to-r from-teal-500 to-emerald-400"
                            : index === 2
                              ? "bg-gradient-to-r from-violet-500 to-fuchsia-400"
                              : "bg-gradient-to-r from-emerald-500 to-lime-400"
                      )}
                      style={{ width: active ? "100%" : index < activeStep ? "72%" : "30%" }}
                    />
                  </div>
                  <p className="mkt-text-subtle mt-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {step.status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["Manual Web Order", "Order Block List"].map((label) => (
            <div
              key={label}
              className="inline-flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-100"
            >
              <span>{label}</span>
              <ArrowRight className="h-4 w-4 text-violet-400" />
            </div>
          ))}
        </div>

        <div className="mkt-live-ticker mt-4 overflow-hidden rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-emerald-400" />
              <p className="mkt-text-muted text-sm font-medium">{STATUS_LINES[activeStatus]}</p>
            </div>
            <p className="mkt-text-subtle text-[11px] font-semibold uppercase tracking-[0.18em]">
              Sign in at {appHost}
            </p>
          </div>
        </div>
      </div>

      <div className="mkt-card rounded-[1.5rem] border border-white/8 bg-slate-950/35 p-4 sm:p-5">
        <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.22em]">
          Flow reminder
        </p>
        <p className="mkt-text mt-2 text-sm leading-relaxed">{copy.reminder}</p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Layers3, PlayCircle, Sparkles } from "lucide-react";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { marketingSectionClass } from "@/lib/marketing-layout";
import { MARKETING_FEATURE_GROUPS } from "@/lib/marketing-site-content";
import {
  getFeaturePageBySlug,
  marketingFeatureHubPath,
} from "@/lib/marketing-feature-pages";
import { WebOrdersFlowShowcase } from "@/components/marketing/WebOrdersFlowShowcase";

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.18em]">{label}</p>
      <p className="mkt-text mt-2 text-sm font-bold leading-snug">{value}</p>
    </div>
  );
}

export function MarketingFeatureDetailPage({
  slug,
  homeHref = "/",
}: {
  slug: string;
  homeHref?: string;
}) {
  return (
    <MarketingSiteShell active="features" homeHref={homeHref}>
      <MarketingFeatureDetailContent slug={slug} homeHref={homeHref} />
    </MarketingSiteShell>
  );
}

function MarketingFeatureDetailContent({
  slug,
  homeHref,
}: {
  slug: string;
  homeHref: string;
}) {
  const page = getFeaturePageBySlug(slug);
  const group = MARKETING_FEATURE_GROUPS.find((item) => item.id === slug);
  const isWebOrders = slug === "web";
  const isApprovedOrders = slug === "orders";

  if (!page || !group) {
    return (
      <main className="relative z-10">
        <section className="py-16 sm:py-24">
          <div className={clsx(marketingSectionClass, "max-w-3xl text-center")}>
            <p className="mkt-text text-sm font-bold uppercase tracking-[0.2em] text-rose-500">
              Not found
            </p>
            <h1 className="mkt-text mt-3 text-3xl font-extrabold">Feature page missing</h1>
            <p className="mkt-text-muted mt-3">
              We could not find that feature page. Open the feature hub and pick another module.
            </p>
            <div className="mt-6">
              <Link
                href={marketingFeatureHubPath(homeHref)}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Open feature hub
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const copy = {
    heroIntro:
      "WooCommerce or Shopify web orders move into the Web Order List, then SMS and auto call confirm them, and finally they go to Approved Orders.",
    journeyTitle: "How the order moves through the system",
    snapshotBadge: "Live path",
    snapshotItems: [
      "Order arrives from Shopify or WooCommerce",
      "The Web Order List holds the new order",
      "Auto SMS and Auto Call confirm the buyer",
      "Approved Orders becomes the packing and courier lane",
    ],
    controlTitle: "Manual control",
    controlBody: "When needed, you can do an extra check with manual web order and block list.",
    resultTitle: "Clear result",
    resultBody: "Only safe, confirmed orders continue to packing and courier.",
    atGlanceTitle: "Explain the flow in 4 lines",
    videoTitle: "Video guide",
    videoName: "How Web Orders work",
    insideTitle: "Inside this module",
    insideKicker: "Everything your team needs to know",
    ctaTitle: "Now you understand the full order lane",
    ctaBody:
      "Use this page to educate buyers, train staff, and show how the product works in day-to-day workflow.",
    seePackages: "See packages",
    openHub: "Open feature hub",
    flowReminder:
      "Orders arrive from Shopify or WooCommerce, move to Web Order List, get SMS and call confirmation, and only then continue to Approved Orders for packing and courier.",
  };

  const approvedCopy = {
    eyebrow: "ORDER OPERATIONS",
    title: "Approved Orders",
    intro:
      "Move orders from Web Order List into a clean approval lane, verify customer and courier details, auto-create courier entries, and route every order to delivery, return pending, or preorder with total control.",
    statSource: "Web Order List",
    statCheck: "Customer & courier ratio check",
    statDispatch: "Courier entry",
    statResult: "Delivery / Return / Preorder",
    flowBadge: "Approval flow",
    flowSteps: [
      {
        step: "01",
        title: "Web Order List to Approved Orders",
        body: "Approved Orders receives the web order after confirmation and becomes the main working lane for packing and dispatch.",
      },
      {
        step: "02",
        title: "Customer & courier ratio check",
        body: "Review customer details, courier ratio, and order readiness before anything moves to shipping.",
      },
      {
        step: "03",
        title: "Courier entry with auto fill",
        body: "Enter the courier once and let the system auto-fill the booking entry so the shipment stays consistent.",
      },
      {
        step: "04",
        title: "Delivery, return or preorder",
        body: "Delivered orders update automatically, returns land in Return Pending, and preorder items stay in a dedicated list.",
      },
    ],
    tools: [
      {
        name: "Scan To Update",
        href: "/dashboard/orders/approved/scan",
        body: "Update statuses quickly with barcode and floor scanning.",
      },
      {
        name: "Super Edit",
        href: "/dashboard/orders/approved/super-edit",
        body: "Edit status, courier and tracking details in bulk.",
      },
      {
        name: "Preorder List",
        href: "/dashboard/orders/approved/preorders",
        body: "Keep items on preorder when stock or timing needs a hold.",
      },
      {
        name: "All List",
        href: "/dashboard/orders/approved/all",
        body: "Open the full order report and review every approved order.",
      },
    ],
    laneLabels: [
      "Pending",
      "RTS",
      "Shipped",
      "Delivered",
      "Returned",
      "Return Pending",
      "Preorder",
    ],
    courierStats: [
      { name: "Overall", rate: "87%", total: "46", success: "40", cancelled: "6" },
      { name: "Pathao", rate: "91%", total: "32", success: "29", cancelled: "3" },
      { name: "RedX", rate: "80%", total: "10", success: "8", cancelled: "2" },
      { name: "CarryBee", rate: "75%", total: "4", success: "3", cancelled: "1" },
    ],
  };

  if (isApprovedOrders) {
    return (
      <main className="relative z-10">
        <>
          <section className="mkt-border-b border-b pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 lg:pb-14">
            <div className={clsx(marketingSectionClass, "max-w-6xl")}>
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
                <div>
                  <p className="mkt-badge-cyan inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:px-4 sm:text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    {approvedCopy.eyebrow}
                  </p>
                  <h1 className="mkt-text mt-5 max-w-3xl text-[2rem] font-extrabold leading-[1.03] tracking-tight sm:text-4xl lg:text-6xl">
                    {approvedCopy.title}
                  </h1>
                  <p className="mkt-text-muted mt-4 max-w-2xl text-[15px] leading-relaxed sm:mt-6 sm:text-base lg:text-lg">
                    {approvedCopy.intro}
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HeroStat label="Source" value={approvedCopy.statSource} />
                    <HeroStat label="Check" value={approvedCopy.statCheck} />
                    <HeroStat label="Courier" value={approvedCopy.statDispatch} />
                    <HeroStat label="Outcome" value={approvedCopy.statResult} />
                  </div>
                </div>

                <div className="mkt-card rounded-[2rem] p-4 sm:p-5">
                  <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/35 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.2em]">
                          {approvedCopy.flowBadge}
                        </p>
                        <h2 className="mkt-text mt-1 text-lg font-extrabold sm:text-xl">
                          Approval flow
                        </h2>
                      </div>
                      <div className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300 ring-1 ring-cyan-400/20">
                        Live lane
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {approvedCopy.flowSteps.map((step) => (
                        <div
                          key={step.step}
                          className="rounded-2xl border border-white/8 bg-white/5 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-sm font-black text-violet-200">
                              {step.step}
                            </div>
                            <div>
                              <p className="mkt-text text-sm font-bold sm:text-base">{step.title}</p>
                              <p className="mkt-text-muted mt-1 text-sm leading-relaxed">
                                {step.body}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8 sm:py-10 lg:py-14">
            <div className={marketingSectionClass}>
              <div className="rounded-[2rem] border border-white/8 bg-slate-950/35 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.2em]">
                      Status lane
                    </p>
                    <h2 className="mkt-text mt-1 text-lg font-extrabold">From approval to delivery</h2>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                    Auto status
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <div className="flex min-w-max items-center gap-3 pb-2">
                    {approvedCopy.laneLabels.map((label, index) => (
                      <div
                        key={label}
                        className="flex items-center gap-3"
                      >
                        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">
                          {label}
                        </div>
                        {index < approvedCopy.laneLabels.length - 1 ? (
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mkt-text-muted mt-4 text-sm leading-relaxed">
                  After courier entry, delivery status updates automatically. If an order is
                  returned, it moves to Return Pending. If you want to keep stock or promise
                  later fulfillment, mark it as preorder.
                </p>
              </div>
            </div>
          </section>

          <section className="py-8 sm:py-10 lg:py-14">
            <div className={marketingSectionClass}>
              <div className="grid gap-4 md:grid-cols-3">
                {approvedCopy.tools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="mkt-card group rounded-[1.5rem] border border-white/8 p-5 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="mkt-text text-base font-bold">{tool.name}</p>
                        <p className="mkt-text-muted mt-2 text-sm leading-relaxed">{tool.body}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-violet-400 transition group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      </main>
    );
  }

  return (
    <main className="relative z-10">
      <section className="mkt-border-b border-b pt-8 pb-6 sm:pt-10 sm:pb-8 lg:pt-12 lg:pb-10">
        <div className={clsx(marketingSectionClass, "max-w-6xl")}>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
            <Link
              href={marketingFeatureHubPath(homeHref)}
              className="inline-flex items-center gap-2 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to features
            </Link>
            <span>•</span>
            <span>{page.kicker}</span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="mkt-badge-cyan inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:px-4 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                {group.label}
              </p>
              <h1 className="mkt-text mt-5 max-w-3xl text-[2rem] font-extrabold leading-[1.03] tracking-tight sm:text-4xl lg:text-6xl">
                {page.title}
              </h1>
              <p className="mkt-text-muted mt-4 max-w-2xl text-[15px] leading-relaxed sm:mt-6 sm:text-base lg:text-lg">
                {copy.heroIntro}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Source" value="Shopify + WooCommerce" />
                <HeroStat label="Automation" value="SMS + Auto Call" />
                <HeroStat label="Outcome" value="Approved Orders" />
              </div>
            </div>

            <div className="mkt-card rounded-[2rem] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/35 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.2em]">
                      {copy.snapshotBadge}
                    </p>
                    <p className="mkt-text mt-1 text-lg font-extrabold">{copy.journeyTitle}</p>
                  </div>
                  <div className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-300 ring-1 ring-cyan-400/20">
                    Live path
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {copy.snapshotItems.map((item, index) => (
                    <div key={item} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-xs font-black text-violet-200">
                          {String(index + 1)}
                        </div>
                        {index < 3 ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
                      </div>
                      <div className="pb-3">
                        <p className="mkt-text text-sm font-bold leading-relaxed">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                    <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.18em]">
                      {copy.controlTitle}
                    </p>
                    <p className="mkt-text mt-2 text-sm leading-relaxed">{copy.controlBody}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                    <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.18em]">
                      {copy.resultTitle}
                    </p>
                    <p className="mkt-text mt-2 text-sm leading-relaxed">{copy.resultBody}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isWebOrders ? (
        <section className="py-8 sm:py-10 lg:py-14">
          <div className={marketingSectionClass}>
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="space-y-4">
                <WebOrdersFlowShowcase appHost="localhost" language="english" />
              </div>

              <div className="mkt-card rounded-[1.75rem] p-4 sm:p-5 lg:sticky lg:top-24">
                <div className="flex h-full flex-col rounded-[1.35rem] border border-white/8 bg-slate-950/30 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mkt-text-subtle text-[11px] font-bold uppercase tracking-[0.2em]">
                        Courier delivery ratio
                      </p>
                      <h2 className="mkt-text mt-1 text-lg font-extrabold">
                        Customer and courier check
                      </h2>
                    </div>
                    <div className="rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-bold text-violet-300 ring-1 ring-violet-400/20">
                      Live ratio
                    </div>
                  </div>

                  <p className="mkt-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
                    Use this lane to compare courier success before approval. It helps the team
                    quickly judge delivery readiness, pending risk, and return chance.
                  </p>

                  <div className="mt-5 border-t border-white/8 pt-4">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {approvedCopy.courierStats.map((stat, index) => (
                      <div
                        key={stat.name}
                        className={clsx(
                          "min-h-[12rem] rounded-[1.35rem] border p-3.5",
                          index === 0
                            ? "border-emerald-400/20 bg-emerald-500/5"
                            : index === 1
                              ? "border-orange-400/20 bg-orange-500/5"
                              : index === 2
                                ? "border-rose-400/20 bg-rose-500/5"
                                : "border-amber-400/20 bg-amber-500/5"
                        )}
                      >
                        <p className="mkt-text text-[11px] font-bold uppercase tracking-[0.18em]">
                          {stat.name}
                        </p>
                        <p className="mt-2 text-2xl font-black text-white">{stat.rate}</p>
                        <p className="mkt-text-subtle mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          Success rate
                        </p>
                        <div className="mt-3 space-y-1.5 text-[13px]">
                          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                            <span className="text-slate-400">Total</span>
                            <span className="font-bold text-slate-100 tabular-nums">{stat.total}</span>
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                            <span className="text-emerald-300">Success</span>
                            <span className="font-bold text-emerald-300 tabular-nums">
                              {stat.success}
                            </span>
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                            <span className="text-rose-300">Cancelled</span>
                            <span className="font-bold text-rose-300 tabular-nums">
                              {stat.cancelled}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="mkt-text-subtle text-xs font-bold uppercase tracking-[0.2em]">
                          {copy.atGlanceTitle}
                        </p>
                        <h3 className="mkt-text mt-1 text-lg font-extrabold">{copy.videoName}</h3>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {copy.snapshotItems.map((item, index) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/30 p-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-xs font-black text-violet-200">
                            {String(index + 1)}
                          </div>
                          <p className="mkt-text-muted text-sm leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="mkt-text-subtle text-xs font-bold uppercase tracking-[0.2em]">
                          {copy.videoTitle}
                        </p>
                        <p className="mkt-text mt-1 text-lg font-extrabold">{copy.videoName}</p>
                      </div>
                      <div className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
                        YouTube
                      </div>
                    </div>
                    <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                      {page.youtubeUrl ? (
                        <iframe
                          className="h-full w-full"
                          src={page.youtubeUrl}
                          title={page.youtubeTitle ?? page.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center">
                          <div>
                            <PlayCircle className="mx-auto h-10 w-10 text-violet-300" />
                            <p className="mkt-text mt-3 text-sm font-bold">YouTube video slot ready</p>
                            <p className="mkt-text-muted mt-2 text-sm leading-relaxed">
                              Add your YouTube embed URL in the feature config and this panel will
                              play the walkthrough here.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-12 sm:py-16 lg:py-20">
        <div className={marketingSectionClass}>
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-violet-500">
            {copy.insideKicker}
          </p>
          <h2 className="mkt-text mt-3 text-center text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            {copy.insideTitle}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="mkt-card rounded-[1.35rem] p-5"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div
                    className={clsx(
                      "mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                      feature.accent
                    )}
                  >
                    <FeatureIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mkt-text text-base font-bold">{feature.title}</h3>
                  <p className="mkt-text-muted mt-2 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mkt-border-b border-t py-12 sm:py-16 lg:py-24">
        <div className={clsx(marketingSectionClass, "max-w-4xl text-center")}>
          <div className="mkt-cta-box overflow-hidden rounded-2xl p-6 sm:rounded-[2rem] sm:p-10 lg:p-14">
            <h2 className="mkt-text text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              {copy.ctaTitle}
            </h2>
            <p className="mkt-text-soft mx-auto mt-3 max-w-2xl text-sm leading-relaxed sm:mt-4 sm:text-base">
              {copy.ctaBody}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/packages"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
              >
                {copy.seePackages}
              </Link>
              <Link
                href={marketingFeatureHubPath(homeHref)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
              >
                {copy.openHub}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

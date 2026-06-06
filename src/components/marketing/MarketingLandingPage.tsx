import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessageSquare,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";
import { getAppHost, getAppLoginUrl, getAppSignupUrl, isSplitDomainMode } from "@/lib/app-hosts";

const features = [
  {
    icon: ShoppingCart,
    title: "Orders",
    text: "Web orders, approved orders, courier handoff, and status tracking.",
  },
  {
    icon: Package,
    title: "Inventory",
    text: "Products, stock movements, smart restock, and WooCommerce sync.",
  },
  {
    icon: Truck,
    title: "Courier",
    text: "Steadfast, Pathao, Carrybee integrations with live tracking.",
  },
  {
    icon: MessageSquare,
    title: "SMS & Auto Call",
    text: "Customer SMS, auto call rules, and follow-up workflows.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    text: "Sales overview, order reports, and business insights.",
  },
];

export function MarketingLandingPage() {
  const loginUrl = getAppLoginUrl();
  const signupUrl = getAppSignupUrl();

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <BrandLogo size="sm" subtitle="Seller OS" />
          <div className="flex items-center gap-2">
            <Link
              href={signupUrl}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign up
            </Link>
            <Link
              href={loginUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-teal-500/20"
            >
              Seller Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700 ring-1 ring-teal-100">
              Bangladesh ecommerce sellers
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-6xl">
              Run your online store from one smart dashboard
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {BRAND_NAME} helps you manage orders, inventory, courier, SMS, and
              web orders — built for Bangladesh sellers.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={loginUrl}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-violet-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/20 transition hover:scale-[1.01]"
              >
                Open Seller Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={signupUrl}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
            {isSplitDomainMode() ? (
              <p className="mt-4 text-sm text-slate-500">
                Dashboard runs on{" "}
                <span className="font-semibold text-slate-700">{getAppHost()}</span>
              </p>
            ) : null}
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6"
              >
                <item.icon className="mb-4 h-8 w-8 text-violet-600" />
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">Ready to manage your store?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Log in to your seller dashboard to start processing orders and inventory.
          </p>
          <Link
            href={loginUrl}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-base font-bold text-white hover:bg-slate-800"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
        © 2026 {BRAND_NAME}
      </footer>
    </div>
  );
}

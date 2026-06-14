import type { MarketingFeatureGroup } from "./marketing-site-content";

export type MarketingFeaturePage = {
  slug: string;
  title: string;
  kicker: string;
  intro: string;
  focus: string[];
  closing: string;
  youtubeTitle?: string;
  youtubeUrl?: string;
};

export const MARKETING_FEATURE_PAGES: Record<string, MarketingFeaturePage> = {
  orders: {
    slug: "orders",
    title: "Approved Orders",
    kicker: "Feature deep dive",
    intro:
      "Use this module to explain how an order moves from new lead to approved shipment, how staff edit it, and how the warehouse finishes the job.",
    focus: [
      "New Order, Order List and All Orders in one workflow",
      "Courier push, scan to update and preorder handling",
      "Super edit for bulk fixes without leaving the screen",
      "Global search to find phone, invoice or tracking ID fast",
    ],
    closing: "This page helps your team understand the whole approval lane, end to end.",
  },
  web: {
    slug: "web-orders",
    title: "Web Orders",
    kicker: "Feature deep dive",
    intro:
      "Show how WooCommerce or Shopify web orders move into the Web Order List, trigger SMS and auto call, and then land in Approved Orders after confirmation.",
    focus: [
      "Web Order List receives WooCommerce and Shopify orders",
      "Auto SMS and Auto Call confirm real buyers",
      "Confirmed orders move to Approved Orders automatically",
      "Manual Web Order and Order Block List keep control in your hands",
    ],
    closing: "Perfect for explaining how the web order machine works from import to approval.",
    youtubeTitle: "How Web Orders work",
    youtubeUrl: process.env.NEXT_PUBLIC_MARKETING_WEB_ORDERS_YOUTUBE_EMBED_URL ?? "",
  },
  inventory: {
    slug: "inventory",
    title: "Inventory",
    kicker: "Feature deep dive",
    intro:
      "Show how stock stays trustworthy across products, movements, transfers and restock signals.",
    focus: [
      "Product catalog, categories and live SKU visibility",
      "Stock in, stock out and transfer tracking",
      "Smart restock suggestions before stock runs dry",
      "Inventory dashboard with alerts and value overview",
    ],
    closing: "This page explains how your team keeps stock accurate without spreadsheets.",
  },
  integrations: {
    slug: "integrations",
    title: "Integrations",
    kicker: "Feature deep dive",
    intro:
      "Explain how WooCommerce, Shopify, courier APIs and sync tools connect into one operating system.",
    focus: [
      "WooCommerce and Shopify sync for product and order flow",
      "Courier integrations for booking and tracking updates",
      "Additional sites and sync products for multi-store sellers",
      "SMS and Auto Call Integration as part of the same stack",
    ],
    closing: "Use this page when you want to show the plumbing behind the promise.",
  },
  business: {
    slug: "business",
    title: "Dashboard, HRM & Automation",
    kicker: "Feature deep dive",
    intro:
      "Show founders the bigger picture: dashboard metrics, accounting, team work and automation across the company.",
    focus: [
      "Dashboard and founder view for sales and profit monitoring",
      "Accounting module for income, expense and ledger flow",
      "HRM, tasks and team workflows",
      "Automation rules for repetitive seller operations",
    ],
    closing: "This page helps explain the parts that turn a store into a system.",
  },
  settings: {
    slug: "settings",
    title: "Settings & Branding",
    kicker: "Feature deep dive",
    intro:
      "Show how the business can brand printouts, manage access and tune the workflow without code.",
    focus: [
      "Team users, roles and access control",
      "Invoice, sticker and shipping note templates",
      "Order sources, tags and delivery method setup",
      "Business profile and branding controls",
    ],
    closing: "This page is the home for operational polish and day-to-day control.",
  },
};

export function getFeaturePageBySlug(slug: string): MarketingFeaturePage | null {
  return MARKETING_FEATURE_PAGES[slug] ?? null;
}

export function marketingFeaturePath(slug: string, pathname?: string): string {
  const prefix = pathname?.startsWith("/marketing") ? "/marketing" : "";
  return `${prefix}/features/${slug}`;
}

export function marketingFeatureHubPath(pathname?: string): string {
  const prefix = pathname?.startsWith("/marketing") ? "/marketing" : "";
  return `${prefix}/features`;
}

export function featurePageGroupIds(): string[] {
  return Object.keys(MARKETING_FEATURE_PAGES);
}

export function featurePageTitleFromGroup(group: MarketingFeatureGroup): string {
  return MARKETING_FEATURE_PAGES[group.id]?.title ?? group.headline;
}

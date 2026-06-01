export type WebOrder = {
  id: string;
  customer: string;
  phone: string;
  product: string;
  amount: number;
  status: "pending" | "confirmed" | "no_response" | "cancelled" | "complete";
  source: "WEB" | "WHATSAPP" | "MANUAL";
  date: string;
};

export const mockWebOrders: WebOrder[] = [
  {
    id: "WO-1042",
    customer: "Rahim Uddin",
    phone: "01712345678",
    product: "Premium T-Shirt (L)",
    amount: 1290,
    status: "pending",
    source: "WEB",
    date: "20 May 2026, 10:32 AM",
  },
  {
    id: "WO-1041",
    customer: "Sadia Akter",
    phone: "01898765432",
    product: "Wireless Earbuds Pro",
    amount: 2490,
    status: "confirmed",
    source: "WEB",
    date: "20 May 2026, 09:15 AM",
  },
  {
    id: "WO-1040",
    customer: "Karim Hassan",
    phone: "01611223344",
    product: "Smart Watch Band",
    amount: 890,
    status: "no_response",
    source: "WHATSAPP",
    date: "19 May 2026, 06:45 PM",
  },
  {
    id: "WO-1039",
    customer: "Nusrat Jahan",
    phone: "01955667788",
    product: "Skincare Bundle",
    amount: 3200,
    status: "complete",
    source: "WEB",
    date: "19 May 2026, 02:20 PM",
  },
  {
    id: "WO-1038",
    customer: "Blocked User",
    phone: "01500998877",
    product: "LED Ring Light",
    amount: 1750,
    status: "cancelled",
    source: "MANUAL",
    date: "18 May 2026, 11:00 AM",
  },
];

export const mockPreorders = [
  { id: "PO-201", product: "iPhone Case 15 Pro", customer: "Aminul", qty: 2, eta: "25 May 2026" },
  { id: "PO-200", product: "Gaming Mouse Pad XL", customer: "Farhana", qty: 1, eta: "22 May 2026" },
  { id: "PO-199", product: "USB-C Hub 7-in-1", customer: "Tanvir", qty: 3, eta: "28 May 2026" },
];

export const mockBlocked = [
  { id: "BL-12", type: "Phone", value: "01500998877", reason: "Repeated fake orders", date: "10 May 2026" },
  { id: "BL-11", type: "IP", value: "103.45.12.88", reason: "Bot traffic", date: "08 May 2026" },
  { id: "BL-10", type: "Phone", value: "01700000000", reason: "Chargeback history", date: "01 May 2026" },
];

export const mockSites = [
  { name: "Main Store", url: "shop.youraiseller.com", status: "connected", orders: 142 },
  { name: "Landing Page", url: "lp.youraiseller.com", status: "connected", orders: 38 },
  { name: "WooCommerce BD", url: "woocommerce.local", status: "disconnected", orders: 0 },
];

import type { WebDisplayStatus } from "./orders-store";

export const statusColors: Record<WebDisplayStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  confirmed: "bg-sky-100 text-sky-800",
  incomplete: "bg-orange-100 text-orange-800",
  good_no_response: "bg-violet-100 text-violet-800",
  no_response: "bg-rose-100 text-rose-800",
  on_hold: "bg-slate-200 text-slate-700",
  complete: "bg-teal-100 text-teal-800",
  cancelled: "bg-slate-100 text-slate-600",
};

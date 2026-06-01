export const overviewStats = [
  {
    id: "orders",
    label: "Total Orders",
    value: "9",
    trend: -71.0,
    icon: "package" as const,
    accent: "indigo" as const,
    featured: true,
  },
  {
    id: "sales",
    label: "Total Sales",
    value: "৳23,700",
    trend: -78.9,
    icon: "wallet" as const,
    accent: "cyan" as const,
  },
  {
    id: "profit",
    label: "Profit",
    value: "৳8,892",
    trend: -64.2,
    icon: "trending" as const,
    accent: "amber" as const,
  },
  {
    id: "pending",
    label: "Pending Web Orders",
    value: "9",
    trend: null,
    icon: "clock" as const,
    accent: "rose" as const,
  },
];

export const webOrderStatus = [
  { name: "No Response", value: 1, color: "#f43f5e" },
  { name: "Advance Payment", value: 1, color: "#5b4dff" },
  { name: "Complete", value: 5, color: "#22d3ee" },
  { name: "Cancel", value: 3, color: "#f59e0b" },
];

export const ordersBySource = [
  { name: "WEB", orders: 6, amount: 16710, color: "#5b4dff" },
  { name: "WHATSAPP", orders: 3, amount: 6990, color: "#ff5c7a" },
];

export const ordersBySourceTable = ordersBySource.map((s) => ({
  source: s.name,
  orders: s.orders,
  amount: `৳${s.amount.toLocaleString("en-BD")}`,
  share: `${Math.round((s.orders / 9) * 100)}%`,
}));

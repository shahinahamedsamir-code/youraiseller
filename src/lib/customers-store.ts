import { isDemoSellerAccount, sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";
import { emitDataUpdated } from "./data-events";

export type SellerCustomer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  spent: number;
  email?: string;
  address?: string;
  district?: string;
};

type OrderLike = {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  status: string;
  total: number;
  createdAt?: string;
  updatedAt?: string;
};

function orderTimestamp(o: OrderLike): number {
  const raw = o.updatedAt || o.createdAt || "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

const DEMO_CUSTOMERS: SellerCustomer[] = [
  {
    id: "C-101",
    name: "Rahim Uddin",
    phone: "01712345678",
    orders: 12,
    spent: 28400,
    address: "Mirpur-10, Dhaka",
    district: "Dhaka",
  },
  {
    id: "C-102",
    name: "Sadia Akter",
    phone: "01898765432",
    orders: 8,
    spent: 19200,
    address: "Agrabad, Chattogram",
    district: "Chattogram",
  },
  {
    id: "C-103",
    name: "Karim Hassan",
    phone: "01611223344",
    orders: 3,
    spent: 5400,
    address: "Zindabazar, Sylhet",
    district: "Sylhet",
  },
];

function storageKey(): string | null {
  return sellerStorageKey("customers");
}

function buildFromOrders(orders: OrderLike[]): SellerCustomer[] {
  const map = new Map<string, SellerCustomer>();
  const sorted = [...orders].sort((a, b) => orderTimestamp(b) - orderTimestamp(a));

  for (const o of sorted) {
    const phone = o.phone.trim();
    if (!phone) continue;
    const prev = map.get(phone) ?? {
      id: `C-${phone.slice(-4)}`,
      name: o.customerName,
      phone,
      orders: 0,
      spent: 0,
      email: o.email,
      address: o.address?.trim() || undefined,
      district: o.district?.trim() || undefined,
    };
    prev.orders += 1;
    if (!["cancelled", "returned", "lost"].includes(o.status)) {
      prev.spent += o.total;
    }
    if (o.email) prev.email = o.email;
    map.set(phone, prev);
  }

  return Array.from(map.values());
}

function saveCustomers(list: SellerCustomer[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list));
  pushSellerData("customers", list);
  emitDataUpdated();
}

/** Update customer DB from this seller's order list (no cross-account data). */
export function syncCustomersFromOrderList(orders: OrderLike[]): SellerCustomer[] {
  const built = buildFromOrders(orders);
  saveCustomers(built);
  return built;
}

export function addCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
}): SellerCustomer {
  const phone = input.phone.trim();
  const name = input.name.trim();
  if (!phone || !name) {
    throw new Error("Name and phone are required.");
  }

  const list = loadCustomers();
  const existing = list.find((c) => c.phone === phone);
  const address = input.address?.trim() || undefined;
  const district = input.district?.trim() || undefined;
  const next: SellerCustomer = existing
    ? {
        ...existing,
        name,
        email: input.email?.trim() || existing.email,
        address: address || existing.address,
        district: district || existing.district,
      }
    : {
        id: `C-${phone.slice(-4)}`,
        name,
        phone,
        orders: 0,
        spent: 0,
        email: input.email?.trim() || undefined,
        address,
        district,
      };

  const merged = [next, ...list.filter((c) => c.phone !== phone)];
  saveCustomers(merged);
  return next;
}

export function loadCustomers(): SellerCustomer[] {
  if (typeof window === "undefined") {
    return isDemoSellerAccount() ? DEMO_CUSTOMERS : [];
  }
  const key = storageKey();
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (isDemoSellerAccount()) {
        saveCustomers(DEMO_CUSTOMERS);
        return DEMO_CUSTOMERS;
      }
      return [];
    }
    return JSON.parse(raw) as SellerCustomer[];
  } catch {
    return isDemoSellerAccount() ? DEMO_CUSTOMERS : [];
  }
}

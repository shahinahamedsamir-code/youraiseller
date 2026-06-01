import { loadOrders, type Order } from "./orders-store";

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 11 ? digits.slice(-11) : digits;
}

export type CustomerOrderStats = {
  total: number;
  success: number;
  successPct: number;
  rating: number;
};

function isSuccessfulOrder(o: Order): boolean {
  if (o.webStatus === "complete" || o.status === "delivered") return true;
  return false;
}

function isCancelledOrder(o: Order): boolean {
  return o.webStatus === "cancelled" || o.status === "cancelled";
}

export function getCustomerOrderStats(phone: string): CustomerOrderStats {
  const key = normalizePhone(phone);
  if (!key) {
    return { total: 0, success: 0, successPct: 0, rating: 0 };
  }

  const related = loadOrders().filter(
    (o) => normalizePhone(o.phone) === key
  );
  const total = related.length;
  const success = related.filter(isSuccessfulOrder).length;
  const counted = related.filter((o) => !isCancelledOrder(o)).length;
  const successPct =
    counted > 0 ? Math.round((success / counted) * 100) : total > 0 ? 0 : 100;

  const tail = parseInt(key.slice(-2), 10);
  const base = Number.isNaN(tail) ? 72 : 68 + (tail % 25);
  const rating = Math.min(
    99,
    Math.round(base * 0.35 + successPct * 0.65)
  );

  return { total, success, successPct, rating };
}

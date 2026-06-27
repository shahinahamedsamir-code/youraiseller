export type PaymentHistoryKind =
  | "plan_renewal"
  | "sms_recharge"
  | "auto_call_recharge"
  | "order_limit";

export type PaymentHistoryMethod = "bkash" | "paystation" | "admin" | "manual";

export type PaymentHistoryStatus = "pending" | "completed" | "failed";

export type PaymentHistoryEntry = {
  id: string;
  kind: PaymentHistoryKind;
  amountTaka: number;
  method: PaymentHistoryMethod;
  status: PaymentHistoryStatus;
  createdAt: string;
  updatedAt?: string;
  invoiceNumber?: string;
  transactionId?: string;
  gatewayStatus?: string;
  gatewayMethod?: string;
  gatewayReference?: string;
  gatewayAmountTaka?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  company?: string;
  scope?: string;
  planId?: string;
  months?: number;
  couponCode?: string;
  discountTaka?: number;
  smsCount?: number;
  callMinutes?: number;
  note?: string;
};

export const PAYMENT_KIND_LABELS: Record<PaymentHistoryKind, string> = {
  plan_renewal: "Plan renewal",
  sms_recharge: "SMS recharge",
  auto_call_recharge: "Auto Call recharge",
  order_limit: "Order limit increase",
};

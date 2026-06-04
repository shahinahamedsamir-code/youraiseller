import { promises as fs } from "fs";
import path from "path";
import { loadSmsAccount, saveSmsAccount } from "./sms-account-server";
import { isSmsSystemEnabled, loadSmsPlatformControl } from "./sms-platform-control";
import type { AutoSmsSetting } from "./sms-integration-mock";
import {
  AUTO_SMS_LOG_LABELS,
  renderSmsTemplate,
  resolveSmsInvoiceNumber,
  resolveSmsOrderId,
} from "./sms-template-utils";
import { formatSmsTimestamp, smsLogStatusFromSend, type SmsLogRow } from "./sms-types";
import {
  detectSmsType,
  getTeamItqanConfig,
  normalizeContactNumber,
  teamItqanSendShoot,
} from "./teamitqan-sms";

export type OrderSmsPayload = {
  id: string;
  invoiceNumber?: string;
  customerName: string;
  phone: string;
  total: number;
  wooNumber?: string;
  wooOrderId?: number;
};

async function loadStoreName(scope: string): Promise<string> {
  try {
    const file = path.join(process.cwd(), "data", "seller", scope, "business.json");
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as { name?: string };
    const name = data?.name?.trim();
    return name || "Our Store";
  } catch {
    return "Our Store";
  }
}

function findAutoRule(
  autoSettings: Record<string, AutoSmsSetting[]>,
  ruleId: string
): AutoSmsSetting | null {
  for (const rows of Object.values(autoSettings)) {
    const row = rows.find((r) => r.id === ruleId);
    if (row) return row;
  }
  return null;
}

export async function sendAutoOrderSms(
  scope: string,
  ruleId: string,
  order: OrderSmsPayload,
  opts?: { manual?: boolean }
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  if (!(await isSmsSystemEnabled())) {
    return { ok: false, skipped: "system_disabled" };
  }

  const account = await loadSmsAccount(scope);
  const control = await loadSmsPlatformControl();
  const rateTaka = control.smsPriceTaka;
  const rule = findAutoRule(account.autoSettings, ruleId);
  if (!rule) {
    return { ok: false, skipped: "rule_not_found" };
  }
  if (!rule.enabled && !opts?.manual) {
    return { ok: false, skipped: "rule_disabled" };
  }

  const phone = normalizeContactNumber(order.phone);
  if (!phone) {
    return { ok: false, error: "Invalid customer phone" };
  }

  const storeName = await loadStoreName(scope);
  const orderId = resolveSmsOrderId(order);
  const invoiceNumber = resolveSmsInvoiceNumber(order);
  const message = renderSmsTemplate(rule.template, {
    name: order.customerName,
    grandTotal: String(order.total),
    orderId,
    invoiceNumber,
    phone: order.phone,
    storeName,
  });

  if (!message.trim()) {
    return { ok: false, error: "Empty message template" };
  }

  const config = getTeamItqanConfig();
  if (!config) {
    return { ok: false, error: "SMS gateway not configured" };
  }

  if (account.balance < 1) {
    return { ok: false, error: "Insufficient SMS balance" };
  }

  const result = await teamItqanSendShoot({
    config,
    contactNumbers: [phone],
    textBody: message,
    label: "transactional",
    type: detectSmsType(message),
  });

  const log: SmsLogRow = {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone: phone.replace(/^88/, "0"),
    message,
    type: AUTO_SMS_LOG_LABELS[ruleId] ?? "Auto",
    status: smsLogStatusFromSend(result.ok),
    sentAt: formatSmsTimestamp(),
    cost: result.ok ? 1 : 0,
    rateTaka: result.ok ? rateTaka : undefined,
    totalTaka: result.ok ? rateTaka : undefined,
    shootId: result.shootId,
    providerCode: result.code,
    providerText: result.message,
  };

  if (result.ok) {
    account.balance -= 1;
  }
  account.logs = [log, ...account.logs].slice(0, 500);
  await saveSmsAccount(scope, account);

  if (!result.ok) {
    return { ok: false, error: result.message || "SMS send failed" };
  }

  return { ok: true };
}

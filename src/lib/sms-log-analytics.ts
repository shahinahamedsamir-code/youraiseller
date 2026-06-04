import { smsLogTaka, type SmsLogRow } from "./sms-types";

export type SmsLogPeriod = "today" | "yesterday" | "30d" | "all";

export function parseSmsLogDate(sentAt: string): Date | null {
  const [datePart, timePart] = sentAt.split(" ");
  if (!datePart) return null;
  const d = new Date(`${datePart}T${timePart ?? "00:00"}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function filterLogsByPeriod(
  logs: SmsLogRow[],
  period: SmsLogPeriod,
  now = new Date()
): SmsLogRow[] {
  if (period === "all") return logs;

  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const from30 = new Date(today);
  from30.setDate(from30.getDate() - 29);

  return logs.filter((row) => {
    const d = parseSmsLogDate(row.sentAt);
    if (!d) return false;
    if (period === "today") return isSameDay(d, today);
    if (period === "yesterday") return isSameDay(d, yesterday);
    return d >= from30 && d <= now;
  });
}

export function filterLogsBySearch(
  logs: SmsLogRow[],
  messageQuery: string,
  phoneQuery: string
): SmsLogRow[] {
  const msg = messageQuery.trim().toLowerCase();
  const phone = phoneQuery.trim().replace(/\D/g, "");
  return logs.filter((row) => {
    if (msg && !row.message.toLowerCase().includes(msg)) return false;
    if (phone && !row.phone.replace(/\D/g, "").includes(phone)) return false;
    return true;
  });
}

export function splitLogTime(sentAt: string): { date: string; time: string } {
  const [datePart, timePart] = sentAt.split(" ");
  if (!datePart) return { date: sentAt, time: "" };
  const d = parseSmsLogDate(sentAt);
  if (!d) return { date: datePart, time: timePart ?? "" };
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    time: timePart ?? d.toLocaleTimeString("en-GB", { hour12: false }),
  };
}

export type SmsLogStats = {
  totalEntries: number;
  totalSms: number;
  totalCost: number;
  todayEntries: number;
  todaySms: number;
  todayCost: number;
  monthEntries: number;
  monthSms: number;
  monthCost: number;
  avgSmsPerLog: number;
  avgCostPerSms: number;
};

export function computeSmsLogStats(
  logs: SmsLogRow[],
  smsPriceTaka: number,
  now = new Date()
): SmsLogStats {
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalSms = 0;
  let totalCost = 0;
  let todayEntries = 0;
  let todaySms = 0;
  let todayCost = 0;
  let monthEntries = 0;
  let monthSms = 0;
  let monthCost = 0;

  for (const row of logs) {
    const d = parseSmsLogDate(row.sentAt);
    const sms = row.cost > 0 ? row.cost : 0;
    const { total } = smsLogTaka(row, smsPriceTaka);
    totalSms += sms;
    totalCost += total;

    if (d && isSameDay(d, today)) {
      todayEntries += 1;
      todaySms += sms;
      todayCost += total;
    }
    if (d && d >= monthStart) {
      monthEntries += 1;
      monthSms += sms;
      monthCost += total;
    }
  }

  const totalEntries = logs.length;
  return {
    totalEntries,
    totalSms,
    totalCost,
    todayEntries,
    todaySms,
    todayCost,
    monthEntries,
    monthSms,
    monthCost,
    avgSmsPerLog: totalEntries > 0 ? Math.round((totalSms / totalEntries) * 10) / 10 : 0,
    avgCostPerSms: totalSms > 0 ? Math.round((totalCost / totalSms) * 100) / 100 : smsPriceTaka,
  };
}

export type SmsHourlyPoint = {
  hour: string;
  sms: number;
  cost: number;
  logs: number;
};

export function buildSmsHourlyChart(
  logs: SmsLogRow[],
  smsPriceTaka: number
): SmsHourlyPoint[] {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    sms: 0,
    cost: 0,
    logs: 0,
  }));

  for (const row of logs) {
    const d = parseSmsLogDate(row.sentAt);
    if (!d) continue;
    const h = d.getHours();
    const sms = row.cost > 0 ? row.cost : 0;
    const { total } = smsLogTaka(row, smsPriceTaka);
    buckets[h]!.sms += sms;
    buckets[h]!.cost += total;
    buckets[h]!.logs += 1;
  }

  return buckets;
}

export function formatPeriodLabel(period: SmsLogPeriod, now = new Date()): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  const today = startOfDay(now);
  if (period === "today") return `${fmt(today)} to ${fmt(today)}`;
  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return `${fmt(y)} to ${fmt(y)}`;
  }
  if (period === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return `${fmt(from)} to ${fmt(today)}`;
  }
  return "All time";
}

export function buildSmsLogsCsv(
  logs: SmsLogRow[],
  smsPriceTaka: number,
  max = 1000
): string {
  const header =
    "Date,Time,Mobile Number,Message,SMS Count,Rate,Total Cost,Status,Type";
  const rows = logs.slice(0, max).map((row) => {
    const { rate, total } = smsLogTaka(row, smsPriceTaka);
    const [date, time] = row.sentAt.split(" ");
    const msg = `"${row.message.replace(/"/g, '""').replace(/\n/g, " ")}"`;
    return [
      date ?? "",
      time ?? "",
      row.phone,
      msg,
      row.cost,
      rate,
      total,
      row.status,
      row.type,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function downloadSmsLogsCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const PERIOD_OPTIONS: { id: SmsLogPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yest." },
  { id: "30d", label: "30D" },
  { id: "all", label: "All" },
];

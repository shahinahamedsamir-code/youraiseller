import type { AutoCallSettings } from "./auto-call-types";

export type AutoCallWindow = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

const TZ = "Asia/Dhaka";

function clampHour(v: number): number {
  if (!Number.isFinite(v)) return 9;
  return Math.min(23, Math.max(0, Math.round(v)));
}

function clampMinute(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(59, Math.max(0, Math.round(v)));
}

export function callWindowFromSettings(settings: AutoCallSettings): AutoCallWindow {
  return {
    startHour: clampHour(settings.callWindowStartHour ?? 9),
    startMinute: clampMinute(settings.callWindowStartMinute ?? 0),
    endHour: clampHour(settings.callWindowEndHour ?? 21),
    endMinute: clampMinute(settings.callWindowEndMinute ?? 0),
  };
}

export function applyCallWindowToSettings(
  settings: AutoCallSettings,
  window: AutoCallWindow
): AutoCallSettings {
  return {
    ...settings,
    callWindowStartHour: clampHour(window.startHour),
    callWindowStartMinute: clampMinute(window.startMinute),
    callWindowEndHour: clampHour(window.endHour),
    callWindowEndMinute: clampMinute(window.endMinute),
  };
}

export function partsToTimeString(hour: number, minute: number): string {
  return `${String(clampHour(hour)).padStart(2, "0")}:${String(clampMinute(minute)).padStart(2, "0")}`;
}

export function timeStringToParts(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":");
  return {
    hour: clampHour(Number(h)),
    minute: clampMinute(Number(m)),
  };
}

function format12(hour: number, minute: number): string {
  const h = clampHour(hour);
  const m = clampMinute(minute);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatCallWindowLabel(window: AutoCallWindow): string {
  return `${format12(window.startHour, window.startMinute)} – ${format12(window.endHour, window.endMinute)}`;
}

function nowMinutesDhaka(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** True when current Bangladesh time is inside the seller's call window. */
export function isWithinCallWindow(settings: AutoCallSettings, at = new Date()): boolean {
  const w = callWindowFromSettings(settings);
  const now = nowMinutesDhaka(at);
  const start = w.startHour * 60 + w.startMinute;
  const end = w.endHour * 60 + w.endMinute;
  if (start === end) return true;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

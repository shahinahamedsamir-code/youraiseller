import { emitDataUpdated } from "./data-events";
import { getSessionUser } from "./dev-users";
import { sellerStorageKey } from "./seller-storage";

export type DeviceApprovalStatus = "pending" | "approved" | "denied" | "revoked";

export type DeviceApproval = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress?: string;
  location?: string;
  trusted: boolean;
  status: DeviceApprovalStatus;
  firstSeenAt: string;
  lastActiveAt: string;
  approvedAt?: string;
  deniedAt?: string;
  revokedAt?: string;
  note?: string;
};

function storageKey(): string | null {
  return sellerStorageKey("device-approvals");
}

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

function parseOs(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

function deviceIdFor(userId: string, ua: string): string {
  let hash = 0;
  for (let i = 0; i < ua.length; i += 1) {
    hash = (hash * 31 + ua.charCodeAt(i)) >>> 0;
  }
  return `dev-${userId}-${hash.toString(36)}`;
}

function loadRaw(): DeviceApproval[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DeviceApproval[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(list: DeviceApproval[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list));
  emitDataUpdated();
}

export function loadDeviceApprovals(): DeviceApproval[] {
  return loadRaw().sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt));
}

export function registerCurrentDevice(): DeviceApproval | null {
  if (typeof window === "undefined") return null;
  const user = getSessionUser();
  if (!user) return null;
  const ua = navigator.userAgent || "Unknown device";
  const id = deviceIdFor(user.id, ua);
  const now = new Date().toISOString();
  const list = loadRaw();
  const idx = list.findIndex((d) => d.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], lastActiveAt: now };
    saveRaw(list);
    return list[idx];
  }
  const entry: DeviceApproval = {
    id,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    deviceName: `${parseBrowser(ua)} on ${parseOs(ua)}`,
    browser: parseBrowser(ua),
    os: parseOs(ua),
    ipAddress: "Current network",
    location: "Approx. current location",
    trusted: true,
    status: "approved",
    firstSeenAt: now,
    lastActiveAt: now,
    approvedAt: now,
    note: "Current signed-in browser",
  };
  saveRaw([entry, ...list]);
  return entry;
}

export function updateDeviceApproval(
  id: string,
  patch: Partial<DeviceApproval>
): DeviceApproval | null {
  const list = loadRaw();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  saveRaw(list);
  return list[idx];
}

export function setDeviceStatus(id: string, status: DeviceApprovalStatus): DeviceApproval | null {
  const now = new Date().toISOString();
  const stamp =
    status === "approved"
      ? { approvedAt: now, deniedAt: undefined, revokedAt: undefined }
      : status === "denied"
        ? { deniedAt: now }
        : status === "revoked"
          ? { revokedAt: now, trusted: false }
          : {};
  return updateDeviceApproval(id, { status, ...stamp });
}

export function toggleTrustedDevice(id: string): DeviceApproval | null {
  const device = loadRaw().find((d) => d.id === id);
  if (!device) return null;
  return updateDeviceApproval(id, { trusted: !device.trusted });
}


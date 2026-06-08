import { promises as fs } from "fs";
import { getPlatformDataDir, platformDataFile } from "./platform-data-path";

export type AutoCallPlatformControl = {
  enabled: boolean;
  /** BDT per auto call attempt (set in dev admin) */
  callPriceTaka: number;
  /** Sellers can pay via bKash (self recharge) */
  selfRechargeEnabled: boolean;
  updatedAt: string;
};

const DATA_FILE = platformDataFile("auto-call-control.json");
export const DEFAULT_AUTO_CALL_PLATFORM_CONTROL: AutoCallPlatformControl = {
  enabled: true,
  callPriceTaka: 1,
  selfRechargeEnabled: true,
  updatedAt: new Date().toISOString(),
};

export async function loadAutoCallPlatformControl(): Promise<AutoCallPlatformControl> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AutoCallPlatformControl>;
    return {
      enabled: parsed.enabled !== false,
      callPriceTaka:
        typeof parsed.callPriceTaka === "number" && parsed.callPriceTaka > 0
          ? parsed.callPriceTaka
          : DEFAULT_AUTO_CALL_PLATFORM_CONTROL.callPriceTaka,
      selfRechargeEnabled: parsed.selfRechargeEnabled !== false,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_AUTO_CALL_PLATFORM_CONTROL };
  }
}

export async function saveAutoCallPlatformControl(
  patch: Partial<
    Pick<AutoCallPlatformControl, "enabled" | "callPriceTaka" | "selfRechargeEnabled">
  >
): Promise<AutoCallPlatformControl> {
  const current = await loadAutoCallPlatformControl();
  const next: AutoCallPlatformControl = {
    enabled: patch.enabled ?? current.enabled,
    callPriceTaka: patch.callPriceTaka ?? current.callPriceTaka,
    selfRechargeEnabled: patch.selfRechargeEnabled ?? current.selfRechargeEnabled,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(getPlatformDataDir(), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function isAutoCallSystemEnabled(): Promise<boolean> {
  const control = await loadAutoCallPlatformControl();
  return control.enabled;
}

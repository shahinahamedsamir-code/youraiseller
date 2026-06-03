import { promises as fs } from "fs";
import path from "path";

export type SmsPlatformControl = {
  enabled: boolean;
  /** BDT per 1 SMS credit */
  smsPriceTaka: number;
  /** Sellers can pay via bKash (self recharge) */
  selfRechargeEnabled: boolean;
  updatedAt: string;
};

const DATA_FILE = path.join(process.cwd(), "data", "platform", "sms-control.json");

export const DEFAULT_SMS_PLATFORM_CONTROL: SmsPlatformControl = {
  enabled: true,
  smsPriceTaka: 0.4,
  selfRechargeEnabled: true,
  updatedAt: new Date().toISOString(),
};

export async function loadSmsPlatformControl(): Promise<SmsPlatformControl> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SmsPlatformControl>;
    return {
      enabled: parsed.enabled !== false,
      smsPriceTaka:
        typeof parsed.smsPriceTaka === "number" && parsed.smsPriceTaka > 0
          ? parsed.smsPriceTaka
          : DEFAULT_SMS_PLATFORM_CONTROL.smsPriceTaka,
      selfRechargeEnabled: parsed.selfRechargeEnabled !== false,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_SMS_PLATFORM_CONTROL };
  }
}

export async function saveSmsPlatformControl(
  patch: Partial<
    Pick<SmsPlatformControl, "enabled" | "smsPriceTaka" | "selfRechargeEnabled">
  >
): Promise<SmsPlatformControl> {
  const current = await loadSmsPlatformControl();
  const next: SmsPlatformControl = {
    enabled: patch.enabled ?? current.enabled,
    smsPriceTaka: patch.smsPriceTaka ?? current.smsPriceTaka,
    selfRechargeEnabled: patch.selfRechargeEnabled ?? current.selfRechargeEnabled,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function isSmsSystemEnabled(): Promise<boolean> {
  const control = await loadSmsPlatformControl();
  return control.enabled;
}

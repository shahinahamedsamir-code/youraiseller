import { promises as fs } from "fs";
import { getPlatformDataDir, platformDataFile } from "./platform-data-path";
import {
  DEFAULT_SUBSCRIPTION_COUPONS,
  normalizeSubscriptionCoupons,
  type SubscriptionCoupon,
} from "./subscription-coupons";

const DATA_FILE = platformDataFile("subscription-coupons.json");

export async function loadSubscriptionCoupons(): Promise<SubscriptionCoupon[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return normalizeSubscriptionCoupons(JSON.parse(raw));
  } catch {
    return DEFAULT_SUBSCRIPTION_COUPONS;
  }
}

export async function saveSubscriptionCoupons(
  coupons: SubscriptionCoupon[]
): Promise<SubscriptionCoupon[]> {
  const next = normalizeSubscriptionCoupons(coupons);
  await fs.mkdir(getPlatformDataDir(), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

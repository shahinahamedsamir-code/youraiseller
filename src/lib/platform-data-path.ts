import path from "path";

/** Platform-wide JSON (users, plan config, SMS/call control). */
export function getPlatformDataDir(): string {
  const custom = process.env.PLATFORM_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "data", "platform");
}

export function getAppDataDir(): string {
  const custom = process.env.APP_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "data");
}

export function platformDataFile(fileName: string): string {
  return path.join(getPlatformDataDir(), fileName);
}

export function appDataFile(fileName: string): string {
  return path.join(getAppDataDir(), fileName);
}

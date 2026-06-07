import path from "path";

/** Seller JSON/audio storage. Set SELLER_DATA_DIR on production to a persistent volume. */
export function getSellerDataDir(): string {
  const custom = process.env.SELLER_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "data", "seller");
}

export function sellerScopeDir(scope: string): string {
  return path.join(getSellerDataDir(), scope);
}

export function sellerDataFile(scope: string, fileName: string): string {
  return path.join(getSellerDataDir(), scope, fileName);
}

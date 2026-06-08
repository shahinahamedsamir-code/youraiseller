export type MarketingTheme = "dark" | "light";

export const MARKETING_THEME_STORAGE_KEY = "youraiseller-marketing-theme";

export function getStoredMarketingTheme(): MarketingTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(MARKETING_THEME_STORAGE_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function storeMarketingTheme(theme: MarketingTheme): void {
  try {
    localStorage.setItem(MARKETING_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

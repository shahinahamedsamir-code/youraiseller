export type MarketingLanguage = "english";

const STORAGE_KEY = "yai-marketing-language";

export function getStoredMarketingLanguage(): MarketingLanguage {
  if (typeof window === "undefined") return "english";

  return "english";
}

export function storeMarketingLanguage(language: MarketingLanguage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "english");
  window.document.documentElement.setAttribute("data-marketing-language", "english");
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getStoredMarketingTheme,
  storeMarketingTheme,
  type MarketingTheme,
} from "@/lib/marketing-theme";

type MarketingThemeContextValue = {
  theme: MarketingTheme;
  setTheme: (theme: MarketingTheme) => void;
  toggleTheme: () => void;
  ready: boolean;
};

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(null);

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MarketingTheme>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setThemeState(getStoredMarketingTheme());
    setReady(true);
  }, []);

  const setTheme = useCallback((next: MarketingTheme) => {
    setThemeState(next);
    storeMarketingTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      storeMarketingTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, ready }),
    [theme, setTheme, toggleTheme, ready]
  );

  return (
    <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    throw new Error("useMarketingTheme must be used within MarketingThemeProvider");
  }
  return ctx;
}

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

function MarketingThemeContextProvider({ children }: { children: ReactNode }) {
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

/** Wraps marketing pages — sets theme on root + provides toggle context */
export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MarketingThemeContextProvider>
      <MarketingThemeRoot>{children}</MarketingThemeRoot>
    </MarketingThemeContextProvider>
  );
}

function MarketingThemeRoot({ children }: { children: ReactNode }) {
  const { theme, ready } = useMarketingTheme();
  return (
    <div
      className="marketing-site relative min-h-screen overflow-x-hidden antialiased"
      data-marketing-theme={ready ? theme : "dark"}
    >
      <div className="marketing-site-glow marketing-site-glow-a" aria-hidden />
      <div className="marketing-site-glow marketing-site-glow-b" aria-hidden />
      <div className="marketing-site-grid pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </div>
  );
}

export function useMarketingTheme() {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    throw new Error("useMarketingTheme must be used within MarketingThemeProvider");
  }
  return ctx;
}

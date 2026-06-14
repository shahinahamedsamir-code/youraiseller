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
  storeMarketingLanguage,
  type MarketingLanguage,
} from "@/lib/marketing-language";

type MarketingLanguageContextValue = {
  language: MarketingLanguage;
  setLanguage: (language: MarketingLanguage) => void;
  toggleLanguage: () => void;
  ready: boolean;
};

const MarketingLanguageContext = createContext<MarketingLanguageContextValue | null>(null);

function MarketingLanguageContextProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MarketingLanguage>("english");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const next = "english" as MarketingLanguage;
    setLanguageState(next);
    storeMarketingLanguage(next);
    setReady(true);
  }, []);

  const setLanguage = useCallback((next: MarketingLanguage) => {
    setLanguageState(next);
    storeMarketingLanguage(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = "english" as MarketingLanguage;
    setLanguageState(next);
    storeMarketingLanguage(next);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, ready }),
    [language, setLanguage, toggleLanguage, ready]
  );

  return (
    <MarketingLanguageContext.Provider value={value}>
      <MarketingLanguageRoot>{children}</MarketingLanguageRoot>
    </MarketingLanguageContext.Provider>
  );
}

export function MarketingLanguageProvider({ children }: { children: ReactNode }) {
  return <MarketingLanguageContextProvider>{children}</MarketingLanguageContextProvider>;
}

function MarketingLanguageRoot({ children }: { children: ReactNode }) {
  const { language, ready } = useMarketingLanguage();
  return (
    <div
      className="marketing-site-language-root"
      data-marketing-language={ready ? language : "english"}
      >
        {children}
    </div>
  );
}

export function useMarketingLanguage() {
  const ctx = useContext(MarketingLanguageContext);
  if (!ctx) {
    throw new Error("useMarketingLanguage must be used within MarketingLanguageProvider");
  }
  return ctx;
}

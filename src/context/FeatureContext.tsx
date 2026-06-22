"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cascadeFeatures,
  DEFAULT_FEATURES,
  FEATURE_LIST,
  applyParentCascade,
  getChildFeatures,
  isParentFeature,
  type FeatureKey,
} from "@/lib/features";
import {
  GLOBAL_FEATURES_UPDATED,
  GLOBAL_FEATURES_KEY,
  mergeEffectiveFeatures,
  loadStoredFeatures,
  saveStoredFeatures,
  SESSION_FEATURES_KEY,
  SESSION_FEATURES_UPDATED,
} from "@/lib/feature-storage";
import {
  fetchGlobalFeaturesFromServer,
  GLOBAL_FEATURES_SERVER_UPDATED,
  saveGlobalFeaturesToServer,
} from "@/lib/global-features-client";

type FeatureContextValue = {
  features: Record<FeatureKey, boolean>;
  isEnabled: (key: FeatureKey) => boolean;
  /** Global Feature Control switch is ON (regardless of the user's plan). */
  isGloballyEnabled: (key: FeatureKey) => boolean;
  /** Allowed globally but NOT in the user's plan → show as locked / upgrade. */
  isLocked: (key: FeatureKey) => boolean;
  toggle: (key: FeatureKey) => void;
  setFeature: (key: FeatureKey, enabled: boolean) => void;
  setFeatures: (features: Record<FeatureKey, boolean>) => void;
  enableAll: () => void;
  disableAll: () => void;
  resetDefaults: () => void;
  enabledCount: number;
  totalCount: number;
  storageKey: string;
  hydrated: boolean;
};

const FeatureContext = createContext<FeatureContextValue | null>(null);

type FeatureProviderProps = {
  children: React.ReactNode;
  /** global = dev admin template; session = logged-in customer */
  mode?: "global" | "session";
};

export function FeatureProvider({
  children,
  mode = "session",
}: FeatureProviderProps) {
  const storageKey = mode === "global" ? GLOBAL_FEATURES_KEY : SESSION_FEATURES_KEY;
  const [globalFeatures, setGlobalFeatures] = useState<Record<FeatureKey, boolean>>(
    DEFAULT_FEATURES
  );
  const [userFeatures, setUserFeatures] = useState<Record<FeatureKey, boolean>>(
    DEFAULT_FEATURES
  );
  const [hydrated, setHydrated] = useState(false);

  const reloadGlobal = useCallback(() => {
    setGlobalFeatures(loadStoredFeatures(GLOBAL_FEATURES_KEY));
  }, []);

  const reloadUser = useCallback(() => {
    setUserFeatures(loadStoredFeatures(SESSION_FEATURES_KEY));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromServer = await fetchGlobalFeaturesFromServer();
      if (cancelled) return;
      setGlobalFeatures(fromServer);
      if (mode === "session") reloadUser();
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, reloadUser]);

  useEffect(() => {
    if (!hydrated || mode !== "session") return;

    const onGlobal = () => reloadGlobal();
    const onGlobalServer = () => reloadGlobal();
    const onSession = () => reloadUser();
    const onStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_FEATURES_KEY) reloadGlobal();
      if (e.key === SESSION_FEATURES_KEY) reloadUser();
    };

    window.addEventListener(GLOBAL_FEATURES_UPDATED, onGlobal);
    window.addEventListener(GLOBAL_FEATURES_SERVER_UPDATED, onGlobalServer);
    window.addEventListener(SESSION_FEATURES_UPDATED, onSession);
    window.addEventListener("youraiseller-users-updated", onSession);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(GLOBAL_FEATURES_UPDATED, onGlobal);
      window.removeEventListener(GLOBAL_FEATURES_SERVER_UPDATED, onGlobalServer);
      window.removeEventListener(SESSION_FEATURES_UPDATED, onSession);
      window.removeEventListener("youraiseller-users-updated", onSession);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrated, mode, reloadGlobal, reloadUser]);

  const features = useMemo(() => {
    if (mode === "global") return globalFeatures;
    return mergeEffectiveFeatures(userFeatures, globalFeatures);
  }, [mode, userFeatures, globalFeatures]);

  useEffect(() => {
    if (!hydrated || mode !== "global") return;
    saveStoredFeatures(GLOBAL_FEATURES_KEY, globalFeatures);
    void saveGlobalFeaturesToServer(globalFeatures);
  }, [globalFeatures, hydrated, mode]);

  const patchGlobal = useCallback(
    (patch: (prev: Record<FeatureKey, boolean>) => Record<FeatureKey, boolean>) => {
      setGlobalFeatures((prev) => patch(prev));
    },
    []
  );

  // Effective flags with parent → child cascade applied (a child is off when
  // its parent menu is off), used for runtime access checks & sidebar.
  const effectiveFeatures = useMemo(() => cascadeFeatures(features), [features]);

  // Global Feature Control switches alone (ignores the user's plan). Used to
  // tell "completely disabled by admin" apart from "needs a plan upgrade".
  const globalEffective = useMemo(
    () => cascadeFeatures(globalFeatures),
    [globalFeatures]
  );

  const isEnabled = useCallback(
    (key: FeatureKey) => effectiveFeatures[key] ?? true,
    [effectiveFeatures]
  );

  const isGloballyEnabled = useCallback(
    (key: FeatureKey) => globalEffective[key] ?? true,
    [globalEffective]
  );

  // Locked = admin allows it globally, but the user's plan does not include it.
  const isLocked = useCallback(
    (key: FeatureKey) =>
      mode === "session" &&
      (globalEffective[key] ?? true) &&
      !(effectiveFeatures[key] ?? true),
    [mode, globalEffective, effectiveFeatures]
  );

  const toggle = useCallback(
    (key: FeatureKey) => {
      if (mode !== "global") return;
      patchGlobal((prev) => {
        if (isParentFeature(key)) {
          const turningOn = !prev[key];
          const children = getChildFeatures(key);
          const allChildrenOn =
            children.length === 0 || children.every((c) => prev[c.key]);
          const turnOn = turningOn || !allChildrenOn;
          return applyParentCascade(prev, key, turnOn);
        }
        return { ...prev, [key]: !prev[key] };
      });
    },
    [mode, patchGlobal]
  );

  const setFeature = useCallback(
    (key: FeatureKey, enabled: boolean) => {
      if (mode !== "global") return;
      patchGlobal((prev) => ({ ...prev, [key]: enabled }));
    },
    [mode, patchGlobal]
  );

  const setFeatures = useCallback(
    (next: Record<FeatureKey, boolean>) => {
      if (mode !== "global") return;
      setGlobalFeatures({ ...DEFAULT_FEATURES, ...next });
    },
    [mode]
  );

  const enableAll = useCallback(() => {
    if (mode !== "global") return;
    setGlobalFeatures({ ...DEFAULT_FEATURES });
  }, [mode]);

  const disableAll = useCallback(() => {
    if (mode !== "global") return;
    setGlobalFeatures(
      Object.fromEntries(FEATURE_LIST.map((f) => [f.key, false])) as Record<
        FeatureKey,
        boolean
      >
    );
  }, [mode]);

  const resetDefaults = useCallback(() => {
    if (mode !== "global") return;
    setGlobalFeatures({ ...DEFAULT_FEATURES });
  }, [mode]);

  const enabledCount = useMemo(
    () => FEATURE_LIST.filter((f) => features[f.key]).length,
    [features]
  );

  const value = useMemo(
    () => ({
      features,
      isEnabled,
      isGloballyEnabled,
      isLocked,
      toggle,
      setFeature,
      setFeatures,
      enableAll,
      disableAll,
      resetDefaults,
      enabledCount,
      totalCount: FEATURE_LIST.length,
      storageKey,
      hydrated,
    }),
    [
      features,
      isEnabled,
      isGloballyEnabled,
      isLocked,
      toggle,
      setFeature,
      setFeatures,
      enableAll,
      disableAll,
      resetDefaults,
      enabledCount,
      storageKey,
      hydrated,
    ]
  );

  return (
    <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
  );
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
}

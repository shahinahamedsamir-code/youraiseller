"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDefaultAutoCallAccount,
  type AutoCallAccount,
} from "@/lib/auto-call-types";
import {
  loadAutoCallAccountLocal,
  refreshAutoCallAccount,
} from "@/lib/auto-call-store";

export function useAutoCallAccount() {
  const [account, setAccount] = useState<AutoCallAccount>(() =>
    loadAutoCallAccountLocal() ?? createDefaultAutoCallAccount()
  );
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [selfRechargeEnabled, setSelfRechargeEnabled] = useState(true);
  const [callPriceTaka, setCallPriceTaka] = useState(1);
  const [defaultDid, setDefaultDid] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await refreshAutoCallAccount();
    if (data) {
      setAccount(data.account);
      setSystemEnabled(data.systemEnabled);
      setSelfRechargeEnabled(data.selfRechargeEnabled);
      setCallPriceTaka(data.callPriceTaka);
      setDefaultDid(data.defaultDid);
      setProviderConfigured(data.providerConfigured);
    } else {
      const local = loadAutoCallAccountLocal();
      if (local) setAccount(local);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const onData = () => {
      const local = loadAutoCallAccountLocal();
      if (local) setAccount(local);
    };
    window.addEventListener("youraiseller-autocall-updated", onData);
    return () => window.removeEventListener("youraiseller-autocall-updated", onData);
  }, [reload]);

  return {
    account,
    setAccount,
    systemEnabled,
    selfRechargeEnabled,
    callPriceTaka,
    defaultDid,
    providerConfigured,
    loading,
    reload,
  };
}

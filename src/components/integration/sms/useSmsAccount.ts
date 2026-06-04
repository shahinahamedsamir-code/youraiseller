"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSmsAccountLocal,
  refreshSmsAccount,
} from "@/lib/sms-store";
import { createDefaultSmsAccount, type SmsAccount } from "@/lib/sms-types";

export function useSmsAccount() {
  const [account, setAccount] = useState<SmsAccount>(() =>
    loadSmsAccountLocal() ?? createDefaultSmsAccount()
  );
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [selfRechargeEnabled, setSelfRechargeEnabled] = useState(true);
  const [smsPriceTaka, setSmsPriceTaka] = useState(0.35);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await refreshSmsAccount();
    if (data) {
      setAccount(data.account);
      setSystemEnabled(data.systemEnabled);
      setSelfRechargeEnabled(data.selfRechargeEnabled);
      setSmsPriceTaka(data.smsPriceTaka);
    } else {
      const local = loadSmsAccountLocal();
      if (local) setAccount(local);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const onData = () => {
      const local = loadSmsAccountLocal();
      if (local) setAccount(local);
    };
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [reload]);

  return {
    account,
    setAccount,
    systemEnabled,
    selfRechargeEnabled,
    smsPriceTaka,
    loading,
    reload,
  };
}

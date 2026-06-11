import { listSellerAutoCallSummaries } from "./auto-call-admin-server";
import { listSellerSmsSummaries } from "./sms-admin-server";
import {
  getTeamItqanAudioConfig,
  teamItqanCheckAudioApiBalance,
  teamItqanCheckDidBalance,
} from "./teamitqan-audio-call";
import { getTeamItqanConfig, teamItqanFetchBalance } from "./teamitqan-sms";

export type SellerBalanceRow = {
  scope: string;
  company: string;
  email: string;
  name: string;
  status: string;
  smsBalance: number;
  smsRechargedTaka: number;
  autoCallBalanceTaka: number;
  autoCallRechargedTaka: number;
};

export type PaymentBalanceReport = {
  generatedAt: string;
  sms: {
    providerConfigured: boolean;
    providerBalance?: number;
    sellerTotal: number;
    sellerRechargedTaka: number;
    topUpGap?: number;
    coveragePct?: number;
  };
  autoCall: {
    providerConfigured: boolean;
    apiBalance?: number;
    didBalance?: number;
    sellerTotalTaka: number;
    sellerRechargedTaka: number;
    topUpGap?: number;
    coveragePct?: number;
  };
  sellers: SellerBalanceRow[];
};

function coveragePct(sellerTotal: number, providerTotal: number | undefined): number | undefined {
  if (providerTotal == null || providerTotal <= 0) return undefined;
  return Math.min(100, Math.round((sellerTotal / providerTotal) * 100));
}

export async function buildPaymentBalanceReport(): Promise<PaymentBalanceReport> {
  const [smsSellers, autoCallSellers] = await Promise.all([
    listSellerSmsSummaries(),
    listSellerAutoCallSummaries(),
  ]);

  const smsByScope = new Map(smsSellers.map((s) => [s.scope, s]));
  const autoByScope = new Map(autoCallSellers.map((s) => [s.scope, s]));
  const scopes = new Set([...smsByScope.keys(), ...autoByScope.keys()]);

  const sellers: SellerBalanceRow[] = Array.from(scopes)
    .map((scope) => {
      const sms = smsByScope.get(scope);
      const auto = autoByScope.get(scope);
      return {
        scope,
        company: sms?.company || auto?.company || scope,
        email: sms?.email || auto?.email || "—",
        name: sms?.name || auto?.name || "—",
        status: sms?.status || auto?.status || "unknown",
        smsBalance: sms?.balance ?? 0,
        smsRechargedTaka: sms?.totalRechargedTaka ?? 0,
        autoCallBalanceTaka: auto?.balanceTaka ?? 0,
        autoCallRechargedTaka: auto?.totalRechargedTaka ?? 0,
      };
    })
    .sort((a, b) => a.company.localeCompare(b.company));

  const smsTotals = smsSellers.reduce(
    (acc, s) => {
      acc.balance += s.balance;
      acc.totalRechargedTaka += s.totalRechargedTaka;
      return acc;
    },
    { balance: 0, totalRechargedTaka: 0 }
  );

  const autoTotals = autoCallSellers.reduce(
    (acc, s) => {
      acc.balanceTaka += s.balanceTaka;
      acc.totalRechargedTaka += s.totalRechargedTaka;
      return acc;
    },
    { balanceTaka: 0, totalRechargedTaka: 0 }
  );

  let smsProviderBalance: number | undefined;
  const smsConfig = getTeamItqanConfig();
  if (smsConfig) {
    try {
      const bal = await teamItqanFetchBalance(smsConfig);
      smsProviderBalance = bal.balance;
    } catch {
      /* optional */
    }
  }

  let autoCallApiBalance: number | undefined;
  let autoCallDidBalance: number | undefined;
  const audioConfig = getTeamItqanAudioConfig();
  if (audioConfig) {
    try {
      const [apiRes, didRes] = await Promise.all([
        teamItqanCheckAudioApiBalance(audioConfig),
        teamItqanCheckDidBalance(audioConfig),
      ]);
      autoCallApiBalance = apiRes.balance;
      autoCallDidBalance = didRes.balance;
    } catch {
      /* optional */
    }
  }

  const smsTopUpGap =
    smsProviderBalance != null
      ? Math.max(0, Math.round((smsTotals.balance - smsProviderBalance) * 100) / 100)
      : undefined;
  const autoCallTopUpGap =
    autoCallApiBalance != null
      ? Math.max(
          0,
          Math.round((autoTotals.balanceTaka - autoCallApiBalance) * 100) / 100
        )
      : undefined;

  return {
    generatedAt: new Date().toISOString(),
    sms: {
      providerConfigured: Boolean(smsConfig),
      providerBalance: smsProviderBalance,
      sellerTotal: smsTotals.balance,
      sellerRechargedTaka: smsTotals.totalRechargedTaka,
      topUpGap: smsTopUpGap,
      coveragePct: coveragePct(smsTotals.balance, smsProviderBalance),
    },
    autoCall: {
      providerConfigured: Boolean(audioConfig),
      apiBalance: autoCallApiBalance,
      didBalance: autoCallDidBalance,
      sellerTotalTaka: autoTotals.balanceTaka,
      sellerRechargedTaka: autoTotals.totalRechargedTaka,
      topUpGap: autoCallTopUpGap,
      coveragePct: coveragePct(autoTotals.balanceTaka, autoCallApiBalance),
    },
    sellers,
  };
}

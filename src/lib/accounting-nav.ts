import type { FeatureKey } from "./features";

export const accountingBasePath = "/dashboard/accounting";
export const accountingExpensesBasePath = "/dashboard/accounting/expenses";

export type AccountingNavItem = {
  label: string;
  href?: string;
  featureKey: FeatureKey;
  expandPath?: string;
  children?: AccountingNavItem[];
};

export const accountingNav: AccountingNavItem[] = [
  { label: "Chart Of Account", href: "/dashboard/accounting/chart-of-accounts", featureKey: "acct_chart" },
  { label: "Accounts", href: "/dashboard/accounting/accounts", featureKey: "acct_accounts" },
  { label: "Transfer", href: "/dashboard/accounting/transfers", featureKey: "acct_transfer" },
  { label: "Assets", href: "/dashboard/accounting/assets", featureKey: "acct_assets" },
  { label: "Expense", href: "/dashboard/accounting/expenses", featureKey: "acct_expenses" },
  { label: "Income", href: "/dashboard/accounting/income", featureKey: "acct_income" },
  { label: "Liabilities", href: "/dashboard/accounting/liabilities", featureKey: "acct_liabilities" },
  { label: "Invoice", href: "/dashboard/accounting/invoice", featureKey: "acct_invoice" },
  { label: "Payment", href: "/dashboard/accounting/payment", featureKey: "acct_payment" },
  { label: "Transaction", href: "/dashboard/accounting/transactions", featureKey: "acct_transactions" },
];

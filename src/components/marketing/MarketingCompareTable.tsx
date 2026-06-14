import clsx from "clsx";

type Row = {
  label: string;
  starter: string;
  growth: string;
  business: string;
  enterprise: string;
};

const ROWS: Row[] = [
  { label: "Websites", starter: "1", growth: "3", business: "10", enterprise: "Unlimited" },
  { label: "Users", starter: "2", growth: "10", business: "50", enterprise: "Unlimited" },
  { label: "Products", starter: "100", growth: "300", business: "1,000", enterprise: "Unlimited" },
  { label: "Orders / Month", starter: "300", growth: "500", business: "1,500", enterprise: "Unlimited" },
  { label: "WooCommerce Integration", starter: "Yes", growth: "Yes", business: "Yes", enterprise: "Yes" },
  { label: "Shopify Integration", starter: "Yes", growth: "Yes", business: "Yes", enterprise: "Yes" },
  { label: "Courier Integration", starter: "Yes", growth: "Yes", business: "Yes", enterprise: "Yes" },
  { label: "SMS Integration", starter: "Yes", growth: "Yes", business: "Yes", enterprise: "Yes" },
  { label: "Auto Call Integration", starter: "Yes", growth: "Yes", business: "Yes", enterprise: "Yes" },
  { label: "Accounting Module", starter: "No", growth: "No", business: "Yes", enterprise: "Yes" },
  { label: "HRM Module", starter: "No", growth: "No", business: "Yes", enterprise: "Yes" },
  { label: "Automation Rules", starter: "No", growth: "No", business: "Yes", enterprise: "Yes" },
  { label: "White Label", starter: "No", growth: "No", business: "No", enterprise: "Yes" },
  { label: "Custom API", starter: "No", growth: "No", business: "No", enterprise: "Yes" },
];

function Cell({ value }: { value: string }) {
  const yes = value === "Yes" || value === "Unlimited";
  const no = value === "No";
  return (
    <span
      className={clsx(
        "inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-xs font-bold",
        yes && "bg-emerald-500/15 text-emerald-400",
        no && "bg-rose-500/15 text-rose-400",
        !yes && !no && "bg-slate-800 text-slate-200"
      )}
    >
      {value}
    </span>
  );
}

export function MarketingCompareTable() {
  return (
    <div className="mkt-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="mkt-border-b border-b mkt-section-alt">
              <th className="mkt-text-subtle px-6 py-3 font-bold">Feature</th>
              <th className="px-4 py-3 text-center font-bold text-slate-300">Starter</th>
              <th className="px-4 py-3 text-center font-bold text-violet-400">Growth</th>
              <th className="px-4 py-3 text-center font-bold text-amber-400">Business</th>
              <th className="px-4 py-3 text-center font-bold text-cyan-400">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, index) => (
              <tr key={row.label} className={index > 0 ? "mkt-border-b border-t" : undefined}>
                <td className="mkt-text-soft px-6 py-3.5 font-medium">{row.label}</td>
                <td className="px-4 py-3.5 text-center">
                  <Cell value={row.starter} />
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Cell value={row.growth} />
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Cell value={row.business} />
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Cell value={row.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import clsx from "clsx";

const ROWS: { label: string; starter: boolean; growth: boolean; business: boolean }[] = [
  { label: "Orders & web list", starter: true, growth: true, business: true },
  { label: "Inventory basics", starter: true, growth: true, business: true },
  { label: "SMS notifications", starter: true, growth: true, business: true },
  { label: "WooCommerce sync", starter: false, growth: true, business: true },
  { label: "Auto Call Center", starter: false, growth: true, business: true },
  { label: "Courier integrations", starter: false, growth: true, business: true },
  { label: "Founder dashboard", starter: false, growth: false, business: true },
  { label: "HRM & automation", starter: false, growth: false, business: true },
];

function PlanMark({ on }: { on: boolean }) {
  return (
    <span
      className={
        on
          ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-600"
          : "mkt-text-faint inline-flex h-7 w-7 items-center justify-center"
      }
    >
      {on ? "✓" : "—"}
    </span>
  );
}

export function MarketingCompareTable() {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {ROWS.map((row) => (
          <div key={row.label} className="mkt-card rounded-2xl p-4">
            <p className="mkt-text mb-3 font-bold">{row.label}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Starter", row.starter, "mkt-text-muted"],
                  ["Growth", row.growth, "text-violet-500"],
                  ["Business", row.business, "text-amber-600"],
                ] as const
              ).map(([name, on, color]) => (
                <div key={name} className="mkt-compare-cell rounded-xl px-2 py-2">
                  <p className={clsx("mb-1 text-[10px] font-bold uppercase", color)}>{name}</p>
                  <PlanMark on={on} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mkt-card hidden overflow-hidden rounded-2xl md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="mkt-border-b border-b mkt-section-alt">
                <th className="mkt-text-subtle px-6 py-3 font-bold">Module</th>
                <th className="mkt-text-muted px-3 py-3 text-center font-bold">Starter</th>
                <th className="px-3 py-3 text-center font-bold text-violet-500">Growth</th>
                <th className="px-3 py-3 text-center font-bold text-amber-600">Business</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={i > 0 ? "mkt-border-b border-t" : undefined}
                >
                  <td className="mkt-text-soft px-6 py-3.5 font-medium">{row.label}</td>
                  <td className="px-3 py-3.5 text-center">
                    <PlanMark on={row.starter} />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <PlanMark on={row.growth} />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <PlanMark on={row.business} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

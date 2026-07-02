import { formatBdt } from "@/lib/accounting-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { orderGrossTotal, type Order } from "@/lib/orders-store";
import { exportCsv } from "./report-utils";
import type { ReportTab } from "./report-types";

export type ReportPdfOptions = {
  title: string;
  subtitle?: string;
  businessName?: string;
  logoUrl?: string;
  kpis?: { label: string; value: string }[];
  headers: string[];
  rows: (string | number)[][];
};

export function printReportPdf(opts: ReportPdfOptions): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank");
  if (!win) return;

  const kpiHtml =
    opts.kpis && opts.kpis.length > 0
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:0 0 20px;">
          ${opts.kpis
            .map(
              (k) =>
                `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc;">
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;">${k.label}</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0f172a;">${k.value}</p>
                </div>`
            )
            .join("")}
        </div>`
      : "";

  const logoHtml = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:8px;" />`
    : "";

  const tableRows = opts.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, idx) =>
              `<td style="padding:8px;border:1px solid #e2e8f0;${
                idx > 0 ? "text-align:right;" : ""
              }">${String(cell)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const headerCells = opts.headers
    .map(
      (h, idx) =>
        `<th style="padding:8px;border:1px solid #e2e8f0;text-align:${
          idx > 0 ? "right" : "left"
        };background:#f1f5f9;">${h}</th>`
    )
    .join("");

  win.document.write(`
    <html>
      <head><title>${opts.title}</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
        ${logoHtml}
        <h2 style="margin:0 0 4px;">${opts.businessName || "YourAI Seller"}</h2>
        <h3 style="margin:0 0 8px;font-weight:600;">${opts.title}</h3>
        ${opts.subtitle ? `<p style="margin:0 0 16px;color:#475569;">${opts.subtitle}</p>` : ""}
        ${kpiHtml}
        <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:12px;">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="margin-top:18px;color:#64748b;font-size:12px;">Generated at ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export type ReportsExportPayload = {
  filteredOrders: Order[];
  courierRows: {
    courier: string;
    total: number;
    delivered: number;
    returned: number;
    pending: number;
  }[];
  courierDeepReport: {
    paymentRows: { courier: string; cod: number; prepaid: number; other: number }[];
    sla?: {
      avgDays: number;
      measured: number;
      byCourier: { courier: string; samples: number; avgDays: number }[];
      rows: { orderId: string; courier: string; days: number }[];
    };
  };
  accountingOptionRows: readonly {
    option: string;
    count: number;
    primary: number;
    secondary: string;
  }[];
  teamProductivityRows: {
    staff: string;
    orders: number;
    edits: number;
    scans: number;
    activity: number;
    revenue: number;
  }[];
  customerReport: {
    topCustomers: {
      name: string;
      phone: string;
      orders: number;
      spent: number;
      lifetimeOrders: number;
    }[];
  };
  webReport: {
    agingRows: {
      orderId: string;
      customer: string;
      phone: string;
      status: string;
      ageDays: number;
      total: number;
    }[];
    sourceMix?: { name: string; count: number; revenue: number }[];
    blockList?: {
      rows: { type: string; value: string; reason: string; matchedOrders: number }[];
    };
  };
  preorderReport: {
    rows: {
      orderId: string;
      customer: string;
      reason: string;
      deliveryAt: string;
      status: string;
      total: number;
      notified: boolean;
    }[];
  };
  marketingReport: {
    orders: number;
    revenue: number;
    adSpend: number;
    roas: number;
    bySource: { name: string; orders: number; revenue: number }[];
  };
  integrationsReport: {
    sms: { total: number; delivered: number; failed: number; cost: number };
    autoCall: { stats: { totalCalls: number; success: number; successRate: number } };
    woo: { connected: boolean; stockSuccess: number; stockFailed: number };
  };
  inventoryReport: {
    lowStock: {
      product: { name: string; code: string; stockQty: number; alertQty: number };
      status: string;
      suggestedQty: number;
    }[];
  };
  grossSales: number;
  filteredOrdersCount: number;
  deliveredCount: number;
  paymentSummary: { advance: number; delivery: number; due: number };
  accountingPl: {
    income: number;
    expense: number;
    netProfit: number;
    margin: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
  };
  rangeLabel: string;
  accRangeLabel: string;
};

export function exportTabCsv(tab: ReportTab, data: ReportsExportPayload): void {
  if (tab === "sales") {
    exportCsv(
      "sales-report.csv",
      ["Order ID", "Date", "Customer", "Courier", "Status", "Total"],
      data.filteredOrders.map((o) => [
        o.id,
        o.createdAt,
        o.customerName,
        o.courier,
        ORDER_STATUS_LABELS[o.status],
        o.total,
      ])
    );
    return;
  }
  if (tab === "courier") {
    exportCsv(
      "courier-deep-report.csv",
      [
        "Courier",
        "Total",
        "Delivered",
        "Returned",
        "Pending",
        "COD",
        "Prepaid",
        "Other Pay",
        "Success %",
      ],
      data.courierRows.map((r) => {
        const success = r.total ? ((r.delivered / r.total) * 100).toFixed(1) : "0.0";
        const pay = data.courierDeepReport.paymentRows.find((p) => p.courier === r.courier);
        return [
          r.courier,
          r.total,
          r.delivered,
          r.returned,
          r.pending,
          pay?.cod ?? 0,
          pay?.prepaid ?? 0,
          pay?.other ?? 0,
          success,
        ];
      })
    );
    return;
  }
  if (tab === "accounting") {
    exportCsv(
      "accounting-option-report.csv",
      ["Option", "Count", "Amount", "Details"],
      data.accountingOptionRows.map((row) => [row.option, row.count, row.primary, row.secondary])
    );
    return;
  }
  if (tab === "staff") {
    exportCsv(
      "team-productivity-report.csv",
      ["Staff", "Orders", "Edits", "Scans", "Activity", "Revenue"],
      data.teamProductivityRows.map((row) => [
        row.staff,
        row.orders,
        row.edits,
        row.scans,
        row.activity,
        row.revenue,
      ])
    );
    return;
  }
  if (tab === "customers") {
    exportCsv(
      "customers-report.csv",
      ["Customer", "Phone", "Orders", "Spent", "Lifetime Orders"],
      data.customerReport.topCustomers.map((row) => [
        row.name,
        row.phone,
        row.orders,
        row.spent,
        row.lifetimeOrders,
      ])
    );
    return;
  }
  if (tab === "web") {
    exportCsv(
      "web-orders-report.csv",
      ["Order ID", "Customer", "Phone", "Queue Status", "Age Days", "Total"],
      data.webReport.agingRows.map((row) => [
        row.orderId,
        row.customer,
        row.phone,
        row.status,
        row.ageDays,
        row.total,
      ])
    );
    return;
  }
  if (tab === "approved_orders" || tab === "orders") {
    exportCsv(
      "approved-order-report.csv",
      ["Metric", "Value"],
      [
        ["Approved Orders", data.filteredOrdersCount],
        ["Delivered", data.deliveredCount],
      ]
    );
    return;
  }
  if (tab === "preorder") {
    exportCsv(
      "preorder-scan-report.csv",
      ["Order ID", "Customer", "Reason", "Delivery", "Status", "Total", "Notified"],
      data.preorderReport.rows.map((row) => [
        row.orderId,
        row.customer,
        row.reason,
        row.deliveryAt,
        row.status,
        row.total,
        row.notified ? "yes" : "no",
      ])
    );
    return;
  }
  if (tab === "marketing") {
    exportCsv(
      "marketing-report.csv",
      ["Source", "Orders", "Revenue", "Ad Spend", "ROAS"],
      [
        ...data.marketingReport.bySource.map((row) => [
          row.name,
          row.orders,
          row.revenue,
          "",
          "",
        ]),
        [
          "Total",
          data.marketingReport.orders,
          data.marketingReport.revenue,
          data.marketingReport.adSpend,
          data.marketingReport.roas.toFixed(2),
        ],
      ]
    );
    return;
  }
  if (tab === "call_sms") {
    exportCsv(
      "call-sms-report.csv",
      ["Channel", "Metric", "Value"],
      [
        ["SMS", "Sent", data.integrationsReport.sms.total],
        ["SMS", "Delivered", data.integrationsReport.sms.delivered],
        ["SMS", "Failed", data.integrationsReport.sms.failed],
        ["SMS", "Cost (BDT)", data.integrationsReport.sms.cost],
        ["Auto Call", "Total Calls", data.integrationsReport.autoCall.stats.totalCalls],
        ["Auto Call", "Pressed 1", data.integrationsReport.autoCall.stats.success],
        [
          "Auto Call",
          "Success %",
          data.integrationsReport.autoCall.stats.successRate.toFixed(1),
        ],
      ]
    );
    return;
  }
  if (tab === "integrations") {
    exportCsv(
      "integrations-report.csv",
      ["Channel", "Metric", "Value"],
      [
        ["WooCommerce", "Connected", data.integrationsReport.woo.connected ? "yes" : "no"],
        ["WooCommerce", "Stock Sync OK", data.integrationsReport.woo.stockSuccess],
        ["WooCommerce", "Stock Sync Failed", data.integrationsReport.woo.stockFailed],
      ]
    );
    return;
  }
  if (tab === "inventory") {
    exportCsv(
      "inventory-report.csv",
      ["Product", "Code", "Stock", "Alert", "Status", "Suggested Qty"],
      data.inventoryReport.lowStock.map((row) => [
        row.product.name,
        row.product.code,
        row.product.stockQty,
        row.product.alertQty,
        row.status,
        row.suggestedQty,
      ])
    );
    return;
  }
  exportCsv(
    "payment-report.csv",
    ["Order ID", "Advance Collected", "Delivery Collected", "Discount", "Due"],
    data.filteredOrders.map((o) => {
      const advance = o.advancePaymentCollectedAmount ?? 0;
      const delivery = o.paymentCollectedAmount ?? 0;
      const payDiscount = o.paymentCollectionDiscount ?? 0;
      const due = Math.max(0, orderGrossTotal(o) - advance - delivery - payDiscount);
      return [o.id, advance, delivery, payDiscount, due];
    })
  );
}

export function buildTabPdfOptions(
  tab: ReportTab,
  data: ReportsExportPayload,
  businessName?: string,
  logoUrl?: string
): ReportPdfOptions {
  const tabTitle = tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, " $1");
  const subtitle = tab === "accounting" ? data.accRangeLabel : data.rangeLabel;

  if (tab === "sales") {
    return {
      title: "Sales Report",
      subtitle,
      businessName,
      logoUrl,
      kpis: [
        { label: "Orders", value: String(data.filteredOrdersCount) },
        { label: "Gross Sales", value: formatBdt(data.grossSales) },
        { label: "Delivered", value: String(data.deliveredCount) },
      ],
      headers: ["Order ID", "Customer", "Status", "Total"],
      rows: data.filteredOrders.slice(0, 50).map((o) => [
        o.id,
        o.customerName,
        ORDER_STATUS_LABELS[o.status],
        formatBdt(o.total),
      ]),
    };
  }

  if (tab === "accounting") {
    return {
      title: "Accounting Report",
      subtitle,
      businessName,
      logoUrl,
      kpis: [
        { label: "Gross Profit", value: formatBdt(data.accountingPl.grossProfit) },
        { label: "Net Profit", value: formatBdt(data.accountingPl.netProfit) },
        { label: "Revenue", value: formatBdt(data.accountingPl.revenue) },
        { label: "COGS", value: formatBdt(data.accountingPl.cogs) },
        { label: "Expense", value: formatBdt(data.accountingPl.expense) },
      ],
      headers: ["Option", "Count", "Amount", "Details"],
      rows: data.accountingOptionRows.map((row) => [
        row.option,
        row.count,
        formatBdt(row.primary),
        row.secondary,
      ]),
    };
  }

  if (tab === "marketing") {
    return {
      title: "Marketing / Meta ROI Report",
      subtitle,
      businessName,
      logoUrl,
      kpis: [
        { label: "Ad Spend", value: formatBdt(data.marketingReport.adSpend) },
        { label: "Revenue", value: formatBdt(data.marketingReport.revenue) },
        { label: "ROAS", value: `${data.marketingReport.roas.toFixed(2)}x` },
        { label: "Orders", value: String(data.marketingReport.orders) },
      ],
      headers: ["Source", "Orders", "Revenue"],
      rows: data.marketingReport.bySource.map((row) => [
        row.name,
        row.orders,
        formatBdt(row.revenue),
      ]),
    };
  }

  if (tab === "staff") {
    return {
      title: "Team Productivity Report",
      subtitle,
      businessName,
      logoUrl,
      headers: ["Staff", "Orders", "Edits", "Scans", "Activity", "Revenue"],
      rows: data.teamProductivityRows.map((row) => [
        row.staff,
        row.orders,
        row.edits,
        row.scans,
        row.activity,
        formatBdt(row.revenue),
      ]),
    };
  }

  if (tab === "web") {
    const mix = data.webReport.sourceMix ?? [];
    return {
      title: "Web Orders Report",
      subtitle,
      businessName,
      logoUrl,
      headers: ["Source", "Orders", "Revenue"],
      rows: [
        ...mix.map((row) => [row.name, row.count, formatBdt(row.revenue)]),
        ...(data.webReport.blockList?.rows ?? []).map((row) => [
          `Block ${row.type}`,
          row.value,
          row.reason,
        ]),
      ],
    };
  }

  if (tab === "courier") {
    const sla = data.courierDeepReport.sla;
    return {
      title: "Courier Report",
      subtitle,
      businessName,
      logoUrl,
      kpis: sla
        ? [
            { label: "Avg Delivery", value: `${sla.avgDays.toFixed(1)} days` },
            { label: "Measured", value: String(sla.measured) },
          ]
        : undefined,
      headers: ["Courier", "Samples", "Avg Days", "Order", "Days"],
      rows: [
        ...data.courierRows.map((r) => [
          r.courier,
          r.total,
          r.delivered,
          r.returned,
          "",
        ]),
        ...(sla?.byCourier ?? []).map((r) => [
          r.courier,
          r.samples,
          r.avgDays.toFixed(1),
          "",
          "",
        ]),
      ],
    };
  }

  if (tab === "payment") {
    return {
      title: "Payment Report",
      subtitle,
      businessName,
      logoUrl,
      kpis: [
        { label: "Advance", value: formatBdt(data.paymentSummary.advance) },
        { label: "Delivery", value: formatBdt(data.paymentSummary.delivery) },
        { label: "Due", value: formatBdt(data.paymentSummary.due) },
      ],
      headers: ["Order ID", "Advance", "Delivery", "Due"],
      rows: data.filteredOrders.slice(0, 50).map((o) => {
        const advance = o.advancePaymentCollectedAmount ?? 0;
        const delivery = o.paymentCollectedAmount ?? 0;
        const payDiscount = o.paymentCollectionDiscount ?? 0;
        const due = Math.max(0, orderGrossTotal(o) - advance - delivery - payDiscount);
        return [o.id, formatBdt(advance), formatBdt(delivery), formatBdt(due)];
      }),
    };
  }

  // Generic fallback for remaining tabs
  const csvHeaders =
    tab === "customers"
      ? ["Customer", "Phone", "Orders", "Spent"]
      : ["Item", "Value"];

  let rows: (string | number)[][] = [];
  if (tab === "customers") {
    rows = data.customerReport.topCustomers.map((r) => [
      r.name,
      r.phone,
      r.orders,
      formatBdt(r.spent),
    ]);
  } else if (tab === "inventory") {
    rows = data.inventoryReport.lowStock.map((r) => [
      r.product.name,
      r.product.stockQty,
      r.status,
      r.suggestedQty,
    ]);
  }

  return {
    title: `${tabTitle} Report`,
    subtitle,
    businessName,
    logoUrl,
    headers: csvHeaders,
    rows,
  };
}

export function exportTabPdf(
  tab: ReportTab,
  data: ReportsExportPayload,
  businessName?: string,
  logoUrl?: string
): void {
  printReportPdf(buildTabPdfOptions(tab, data, businessName, logoUrl));
}

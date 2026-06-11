import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

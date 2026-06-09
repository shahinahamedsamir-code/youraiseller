"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExpenseListPanel } from "./ExpenseListPanel";
import { NewExpenseModal } from "./NewExpenseModal";

export function ExpensesPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const openModal = () => {
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        actions={
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1d4ed8]"
          >
            <Plus className="h-4 w-4" />
            New Expense
          </button>
        }
      />

      <NewExpenseModal
        key={formKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ExpenseListPanel />
    </div>
  );
}

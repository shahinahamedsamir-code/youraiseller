"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductForm } from "@/components/inventory/ProductForm";

export default function AddProductPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") ?? undefined;
  const isEdit = Boolean(editId);

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Product" : "Add New Product"}
        description={
          isEdit
            ? "Update product information, pricing & stock setup"
            : "Upload product with smart pricing & stock alerts"
        }
      />
      <ProductForm editId={editId} />
    </div>
  );
}

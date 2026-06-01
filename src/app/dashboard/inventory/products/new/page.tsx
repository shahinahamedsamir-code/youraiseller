"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ProductForm } from "@/components/inventory/ProductForm";

export default function AddProductPage() {
  return (
    <div>
      <PageHeader
        title="Add New Product"
        description="Upload product with smart pricing & stock alerts"
      />
      <ProductForm />
    </div>
  );
}

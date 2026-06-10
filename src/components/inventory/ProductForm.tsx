"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Plus,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  addBrand,
  addCategory,
  createProduct,
  getProduct,
  loadBrands,
  loadCategories,
  updateProduct,
  type Product,
} from "@/lib/inventory-store";
import { AddInventoryNameModal } from "@/components/inventory/AddInventoryNameModal";

type ModalKind = "category" | "brand" | null;

type Props = {
  onSuccess?: (product: Product) => void;
  editId?: string;
};

export function ProductForm({ onSuccess, editId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(editId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState(loadCategories);
  const [brands, setBrands] = useState(loadBrands);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [modalKind, setModalKind] = useState<ModalKind>(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    categoryId: "",
    brandId: "",
    costPrice: "",
    sellPrice: "",
    websitePrice: "",
    stockQty: "0",
    alertQty: "10",
    manageStock: true,
    featured: false,
    active: true,
    weight: "0",
    weightUnit: "kg" as "kg" | "g",
  });

  useState(() => {
    if (!editId) return;
    const p = getProduct(editId);
    if (!p) {
      setError("Product not found.");
      return;
    }
    setForm({
      name: p.name,
      code: p.code,
      categoryId: p.categoryId,
      brandId: p.brandId,
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      websitePrice: String(p.websitePrice),
      stockQty: String(p.stockQty),
      alertQty: String(p.alertQty),
      manageStock: p.manageStock,
      featured: p.featured,
      active: p.active,
      weight: String(p.weight),
      weightUnit: p.weightUnit,
    });
    if (p.imageDataUrl) {
      if (/^https?:\/\//i.test(p.imageDataUrl)) setImageUrl(p.imageDataUrl);
      else setUploadPreview(p.imageDataUrl);
    }
  });

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const displayPreview =
    uploadPreview ?? (imageUrl.trim() ? imageUrl.trim() : null);

  const resolveProductImage = (): string | undefined => {
    if (uploadPreview) return uploadPreview;
    const url = imageUrl.trim();
    if (!url) return undefined;
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Image URL must start with http:// or https://");
    }
    return url;
  };

  const suggestCode = () => {
    if (form.code.trim()) return;
    const code =
      "SKU-" +
      form.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8) +
      "-" +
      Date.now().toString().slice(-4);
    setForm((f) => ({ ...f, code }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.categoryId || !form.brandId) {
      setError("Select category and brand.");
      return;
    }

    try {
      if (isEdit && editId) {
        const updated = updateProduct(editId, {
          name: form.name.trim(),
          code: form.code.trim() || `SKU-${Date.now()}`,
          categoryId: form.categoryId,
          brandId: form.brandId,
          costPrice: parseFloat(form.costPrice) || 0,
          sellPrice: parseFloat(form.sellPrice) || 0,
          websitePrice: parseFloat(form.websitePrice) || parseFloat(form.sellPrice) || 0,
          stockQty: parseInt(form.stockQty, 10) || 0,
          alertQty: parseInt(form.alertQty, 10) || 10,
          manageStock: form.manageStock,
          featured: form.featured,
          active: form.active,
          weight: parseFloat(form.weight) || 0,
          weightUnit: form.weightUnit,
          imageDataUrl: resolveProductImage(),
        });
        if (!updated) throw new Error("Could not update product.");
        setSuccess(`Product "${updated.name}" updated!`);
        onSuccess?.(updated);
      } else {
        const product = createProduct({
          name: form.name.trim(),
          code: form.code.trim() || `SKU-${Date.now()}`,
          categoryId: form.categoryId,
          brandId: form.brandId,
          costPrice: parseFloat(form.costPrice) || 0,
          sellPrice: parseFloat(form.sellPrice) || 0,
          websitePrice: parseFloat(form.websitePrice) || parseFloat(form.sellPrice) || 0,
          stockQty: parseInt(form.stockQty, 10) || 0,
          alertQty: parseInt(form.alertQty, 10) || 10,
          manageStock: form.manageStock,
          featured: form.featured,
          active: form.active,
          weight: parseFloat(form.weight) || 0,
          weightUnit: form.weightUnit,
          imageDataUrl: resolveProductImage(),
        });
        setSuccess(`Product "${product.name}" saved!`);
        onSuccess?.(product);
      }
      setTimeout(() => router.push("/dashboard/inventory/products"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
    }
  };

  const handleModalSubmit = (name: string) => {
    try {
      if (modalKind === "category") {
        const c = addCategory(name);
        setCategories(loadCategories());
        setForm((f) => ({ ...f, categoryId: c.id }));
      } else if (modalKind === "brand") {
        const b = addBrand(name);
        setBrands(loadBrands());
        setForm((f) => ({ ...f, brandId: b.id }));
      }
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : "Could not save.",
      };
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Basic Information
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={suggestCode}
              className={inputCls}
              placeholder="Premium T-Shirt"
            />
          </Field>
          <Field label="Product Code" required>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputCls}
              placeholder="SKU-001"
            />
          </Field>
          <Field label="Category">
            <div className="flex gap-2">
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setModalKind("category")} className={plusBtn}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="Brand">
            <div className="flex gap-2">
              <select
                required
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setModalKind("brand")} className={plusBtn}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Field>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
          Pricing &amp; Inventory
        </h3>
        <p className="mb-4 text-xs text-slate-400">Prices support decimal values (৳)</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MoneyField
            label="Cost Price"
            value={form.costPrice}
            onChange={(v) => setForm({ ...form, costPrice: v })}
          />
          <MoneyField
            label="Sell Price"
            value={form.sellPrice}
            onChange={(v) => setForm({ ...form, sellPrice: v })}
          />
          <MoneyField
            label="Website Regular Price"
            value={form.websitePrice}
            onChange={(v) => setForm({ ...form, websitePrice: v })}
          />
          <Field label="Stock Qty">
            <input
              type="number"
              min={0}
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Alert Qty">
            <input
              type="number"
              min={0}
              value={form.alertQty}
              onChange={(e) => setForm({ ...form, alertQty: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.manageStock}
              onChange={(e) => setForm({ ...form, manageStock: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-teal-500"
            />
            <span>
              <span className="text-sm font-semibold text-slate-800">Manage Stock</span>
              <span className="block text-xs text-slate-500">Enable to track stock levels</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-teal-500"
            />
            <span>
              <span className="text-sm font-semibold text-slate-800">Featured Product</span>
              <span className="block text-xs text-slate-500">Show more prominently</span>
            </span>
          </label>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Weight &amp; Image
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
              Product Weight
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className={inputCls}
              />
              <div className="flex rounded-xl border border-slate-200 p-1">
                {(["kg", "g"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm({ ...form, weightUnit: u })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      form.weightUnit === u
                        ? "bg-teal-500 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
              Product Image
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:border-teal-300"
            >
              {displayPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayPreview}
                  alt="Preview"
                  className="max-h-28 rounded-lg object-contain"
                  onError={() => {
                    if (!uploadPreview && imageUrl.trim()) {
                      setError("Could not load image from URL.");
                    }
                  }}
                />
              ) : (
                <>
                  <ImageIcon className="mb-2 h-8 w-8 text-slate-300" />
                  <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                    <Upload className="h-4 w-4" /> Choose File
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setError("");
                handleImage(e.target.files?.[0]);
              }}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
                Image URL{" "}
                <span className="font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setError("");
                  setImageUrl(e.target.value);
                }}
                placeholder="https://example.com/product.jpg"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </p>
      )}

      <button
        type="submit"
        className="rounded-xl bg-gradient-to-r from-teal-500 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:brightness-105"
      >
        {isEdit ? "Update Product" : "Save Product"}
      </button>
    </form>

    {modalKind && (
      <AddInventoryNameModal
        kind={modalKind}
        open={Boolean(modalKind)}
        onClose={() => setModalKind(null)}
        onSubmit={handleModalSubmit}
      />
    )}
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
const plusBtn =
  "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-600 hover:bg-teal-50";

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          ৳
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pl-8`}
        />
      </div>
    </Field>
  );
}

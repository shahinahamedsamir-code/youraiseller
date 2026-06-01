"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddInventoryNameModal,
  type InventoryNameSubmitResult,
} from "@/components/inventory/AddInventoryNameModal";
import { DeleteInventoryItemModal } from "@/components/inventory/DeleteInventoryItemModal";
import {
  addBrand,
  addCategory,
  countProductsByBrand,
  countProductsByCategory,
  deleteBrand,
  deleteCategory,
  loadBrands,
  loadCategories,
  updateBrand,
  updateCategory,
  type Brand,
  type Category,
} from "@/lib/inventory-store";
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

type Kind = "category" | "brand";

type NameModalState =
  | { kind: Kind; mode: "add" }
  | { kind: Kind; mode: "edit"; item: Category | Brand }
  | null;

type PendingDelete = {
  kind: Kind;
  id: string;
  name: string;
  productCount: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [nameModal, setNameModal] = useState<NameModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(() => {
    setCategories(loadCategories());
    setBrands(loadBrands());
  }, []);

  useEffect(() => {
    refresh();
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(t);
  }, [success]);

  const categoryProductTotal = useMemo(
    () =>
      categories.reduce((sum, c) => sum + countProductsByCategory(c.id), 0),
    [categories]
  );

  const brandProductTotal = useMemo(
    () => brands.reduce((sum, b) => sum + countProductsByBrand(b.id), 0),
    [brands]
  );

  const handleNameSubmit = (name: string): InventoryNameSubmitResult => {
    if (!nameModal) return { ok: false, message: "Something went wrong." };

    try {
      if (nameModal.mode === "add") {
        if (nameModal.kind === "category") {
          addCategory(name);
          setSuccess(`Category "${name}" added.`);
        } else {
          addBrand(name);
          setSuccess(`Brand "${name}" added.`);
        }
      } else {
        const result =
          nameModal.kind === "category"
            ? updateCategory(nameModal.item.id, name)
            : updateBrand(nameModal.item.id, name);
        if (!result.ok) return result;
        setSuccess(
          `${nameModal.kind === "category" ? "Category" : "Brand"} renamed to "${name}".`
        );
      }
      setError("");
      refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Could not save.",
      };
    }
  };

  const handleDelete = () => {
    if (!pendingDelete || pendingDelete.productCount > 0) return;
    setError("");
    const result =
      pendingDelete.kind === "category"
        ? deleteCategory(pendingDelete.id)
        : deleteBrand(pendingDelete.id);

    if (!result.ok) {
      setError(result.message);
      setPendingDelete(null);
      return;
    }

    setSuccess(
      `${pendingDelete.kind === "category" ? "Category" : "Brand"} "${pendingDelete.name}" deleted.`
    );
    refresh();
    setPendingDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Categories & Brands"
        description="Organize products for smart filtering and reports"
      />

      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {success && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={Layers}
          label="Categories"
          count={categories.length}
          sub={`${categoryProductTotal} linked product${categoryProductTotal === 1 ? "" : "s"}`}
          accent="teal"
        />
        <SummaryCard
          icon={Tag}
          label="Brands"
          count={brands.length}
          sub={`${brandProductTotal} linked product${brandProductTotal === 1 ? "" : "s"}`}
          accent="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          kind="category"
          title="Categories"
          icon={Layers}
          accent="teal"
          items={categories}
          getProductCount={countProductsByCategory}
          onAdd={() => setNameModal({ kind: "category", mode: "add" })}
          onEdit={(item) =>
            setNameModal({ kind: "category", mode: "edit", item })
          }
          onDelete={(item) =>
            setPendingDelete({
              kind: "category",
              id: item.id,
              name: item.name,
              productCount: countProductsByCategory(item.id),
            })
          }
        />
        <ListCard
          kind="brand"
          title="Brands"
          icon={Tag}
          accent="violet"
          items={brands}
          getProductCount={countProductsByBrand}
          onAdd={() => setNameModal({ kind: "brand", mode: "add" })}
          onEdit={(item) => setNameModal({ kind: "brand", mode: "edit", item })}
          onDelete={(item) =>
            setPendingDelete({
              kind: "brand",
              id: item.id,
              name: item.name,
              productCount: countProductsByBrand(item.id),
            })
          }
        />
      </div>

      {nameModal && (
        <AddInventoryNameModal
          kind={nameModal.kind}
          mode={nameModal.mode}
          open
          initialName={nameModal.mode === "edit" ? nameModal.item.name : ""}
          onClose={() => setNameModal(null)}
          onSubmit={handleNameSubmit}
        />
      )}

      {pendingDelete && (
        <DeleteInventoryItemModal
          kind={pendingDelete.kind}
          name={pendingDelete.name}
          productCount={pendingDelete.productCount}
          open
          onClose={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  count,
  sub,
  accent,
}: {
  icon: typeof Layers;
  label: string;
  count: number;
  sub: string;
  accent: "teal" | "violet";
}) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl p-5">
      <span
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          accent === "teal"
            ? "bg-teal-100 text-teal-600"
            : "bg-violet-100 text-violet-600"
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900">{count}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function ListCard({
  kind,
  title,
  icon: Icon,
  accent,
  items,
  getProductCount,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: Kind;
  title: string;
  icon: typeof Layers;
  accent: "teal" | "violet";
  items: (Category | Brand)[];
  getProductCount: (id: string) => number;
  onAdd: () => void;
  onEdit: (item: Category | Brand) => void;
  onDelete: (item: Category | Brand) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="yai-panel overflow-hidden">
      <div
        className={clsx(
          "border-b border-slate-100 px-5 py-4",
          accent === "teal"
            ? "bg-gradient-to-r from-teal-50/80 to-emerald-50/40"
            : "bg-gradient-to-r from-violet-50/80 to-indigo-50/40"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                accent === "teal"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                  : "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">
                {items.length} item{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className={clsx(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-md hover:brightness-105",
              accent === "teal"
                ? "bg-gradient-to-r from-teal-500 to-emerald-500 shadow-teal-500/20"
                : "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-violet-500/20"
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {search ? "No matches found" : `No ${title.toLowerCase()} yet`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {search
              ? "Try a different search term."
              : `Click Add to create your first ${kind}.`}
          </p>
          {!search && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add {kind === "category" ? "Category" : "Brand"}
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((item) => {
            const productCount = getProductCount(item.id);
            const initial = item.name.trim().charAt(0).toUpperCase() || "?";

            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/80"
              >
                <span
                  className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    accent === "teal"
                      ? "bg-teal-50 text-teal-700"
                      : "bg-violet-50 text-violet-700"
                  )}
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {item.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Package className="h-3 w-3" />
                    {productCount} product{productCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`Delete ${item.name}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  FileText,
  Link2,
  Tag,
  Paperclip,
  X,
  Check,
} from "lucide-react";
import {
  loadOrderTags,
  ORDER_TAGS_UPDATED,
  orderTagChipClass,
  type OrderTag,
} from "@/lib/order-tags-store";
import type { OrderAttachment } from "@/lib/orders-store";

type Panel = "note" | "link" | "tags" | "files" | null;

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file

type Props = {
  note: string;
  onNoteChange: (v: string) => void;
  link: string;
  onLinkChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  attachments: OrderAttachment[];
  onAttachmentsChange: (v: OrderAttachment[]) => void;
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function OrderExtraOptions({
  note,
  onNoteChange,
  link,
  onLinkChange,
  tags,
  onTagsChange,
  attachments,
  onAttachmentsChange,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [allTags, setAllTags] = useState<OrderTag[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setAllTags(loadOrderTags());
    refresh();
    window.addEventListener(ORDER_TAGS_UPDATED, refresh);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => {
      window.removeEventListener(ORDER_TAGS_UPDATED, refresh);
      window.removeEventListener("youraiseller-data-updated", refresh);
    };
  }, []);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const toggleTag = (label: string) => {
    onTagsChange(
      tags.includes(label) ? tags.filter((t) => t !== label) : [...tags, label]
    );
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setFileError(null);
    const next = [...attachments];
    let pending = files.length;
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" is larger than 2 MB and was skipped.`);
        pending -= 1;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        next.push({
          name: file.name,
          dataUrl: String(reader.result ?? ""),
          size: file.size,
          type: file.type,
        });
        pending -= 1;
        if (pending <= 0) onAttachmentsChange([...next]);
      };
      reader.onerror = () => {
        pending -= 1;
        if (pending <= 0) onAttachmentsChange([...next]);
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const tools: {
    key: Exclude<Panel, null>;
    icon: typeof FileText;
    label: string;
    active: boolean;
    count?: number;
  }[] = [
    { key: "note", icon: FileText, label: "Add note", active: !!note.trim() },
    { key: "link", icon: Link2, label: "Reference link", active: !!link.trim() },
    {
      key: "tags",
      icon: Tag,
      label: "Order tags",
      active: tags.length > 0,
      count: tags.length,
    },
    {
      key: "files",
      icon: Paperclip,
      label: "Attach file",
      active: attachments.length > 0,
      count: attachments.length,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-3 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
        Extra options
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            title={t.label}
            aria-pressed={panel === t.key}
            className={clsx(
              "relative flex h-10 w-10 items-center justify-center rounded-xl border transition",
              panel === t.key
                ? "border-indigo-400 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100"
                : t.active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-500"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.count ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {t.count}
              </span>
            ) : t.active ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Selected tags summary */}
      {tags.length > 0 && panel !== "tags" && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((label) => {
            const meta = allTags.find((t) => t.label === label);
            return (
              <span
                key={label}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                  orderTagChipClass(meta?.color ?? "slate")
                )}
              >
                {label}
                <button
                  type="button"
                  onClick={() => toggleTag(label)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Panels */}
      {panel === "note" && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-bold text-slate-500">
            Internal note (private)
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            placeholder="Note for your team — not printed on invoice"
            className={inputCls}
            autoFocus
          />
        </div>
      )}

      {panel === "link" && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-bold text-slate-500">
            Reference link
          </label>
          <input
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={inputCls}
            autoFocus
          />
        </div>
      )}

      {panel === "tags" && (
        <div className="mt-3 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Select tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const on = tags.includes(t.label);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.label)}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition",
                    on
                      ? orderTagChipClass(t.color)
                      : "bg-white text-slate-500 ring-slate-200 hover:ring-indigo-300"
                  )}
                >
                  {on && <Check className="h-3 w-3" />}
                  {t.label}
                </button>
              );
            })}
            {allTags.length === 0 && (
              <span className="text-xs text-slate-400">
                No tags yet — add them in Settings → Order Tags.
              </span>
            )}
          </div>
        </div>
      )}

      {panel === "files" && (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            <Paperclip className="h-4 w-4" />
            Choose file(s) — max 2 MB each
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {fileError && (
            <p className="text-xs font-medium text-rose-600">{fileError}</p>
          )}
          {attachments.length > 0 && (
            <ul className="space-y-1.5">
              {attachments.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {a.name}
                  </span>
                  {a.size ? (
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {(a.size / 1024).toFixed(0)} KB
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      onAttachmentsChange(attachments.filter((_, j) => j !== i))
                    }
                    className="shrink-0 text-rose-500 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

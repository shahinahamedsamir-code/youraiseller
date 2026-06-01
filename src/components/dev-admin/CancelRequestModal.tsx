"use client";

import { useEffect, useState } from "react";
import type { DevUser } from "@/lib/dev-users";
import { X, Ban } from "lucide-react";

type Props = {
  user: DevUser | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (cancelNote: string) => void;
};

export function CancelRequestModal({ user, open, onClose, onConfirm }: Props) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
      setError("");
    }
  }, [open, user?.id]);

  if (!open || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      setError("Please write a cancel note (at least 3 characters).");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Ban className="h-5 w-5 text-rose-400" />
              Cancel request
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
          Cancel note *
        </label>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError("");
          }}
          rows={4}
          className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
          placeholder="Why is this request cancelled? (e.g. incomplete info, duplicate account…)"
          autoFocus
        />
        {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300"
          >
            Back
          </button>
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
          >
            Confirm cancel
          </button>
        </div>
      </form>
    </div>
  );
}

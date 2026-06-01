"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { smsTemplates } from "@/lib/mock-admin";
import { MessageSquare, Plus, Send } from "lucide-react";

export default function SMSPage() {
  return (
    <div>
      <PageHeader
        title="SMS"
        description="SMS templates and bulk messaging"
        actions={
          <>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Template
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
            >
              <Send className="h-4 w-4" /> Send Message
            </button>
          </>
        }
      />
      <div className="mb-6 glass-card rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-slate-800">Quick Send</h3>
        <textarea
          rows={3}
          placeholder="Type your message..."
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400"
        />
        <input
          type="text"
          placeholder="Phone numbers (comma separated)"
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Send SMS
        </button>
      </div>
      <div className="space-y-3">
        {smsTemplates.map((t) => (
          <div key={t.id} className="glass-card flex items-start gap-4 rounded-2xl p-5">
            <MessageSquare className="h-5 w-5 shrink-0 text-teal-500" />
            <div>
              <p className="font-bold text-slate-800">{t.name}</p>
              <p className="mt-1 text-sm text-slate-600">{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

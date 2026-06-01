"use client";

import { motion } from "framer-motion";
import { Bot, MessageCircle, Phone } from "lucide-react";

export function HelpAssistant() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/90 p-2 shadow-xl backdrop-blur-md">
        {[
          { icon: MessageCircle, color: "bg-green-500", label: "WhatsApp" },
          { icon: Phone, color: "bg-blue-500", label: "Call" },
        ].map(({ icon: Icon, color, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} text-white shadow-md transition hover:scale-105`}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:scale-[1.02] hover:shadow-xl"
      >
        <Bot className="h-5 w-5" />
        Help Assistant
      </button>
    </motion.div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

const ToastCtx = createContext<(message: string, type?: Toast["type"]) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastCtx);
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4400);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex max-w-[92vw] flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={`flex items-center gap-3 rounded-xl border-[1.5px] border-ink px-4 py-3 text-sm font-medium shadow-hard-sm ${
                t.type === "success"
                  ? "bg-lime text-ink"
                  : t.type === "error"
                  ? "bg-vermilion text-paper"
                  : "bg-card text-ink"
              }`}
            >
              <span className="text-base">
                {t.type === "success" ? "✦" : t.type === "error" ? "⚠" : "ℹ"}
              </span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

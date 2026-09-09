"use client";

import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { AccountCreateForm } from "@/components/settings/account-create-form";

interface AccountCreateTileProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountCreateTile({
  isOpen,
  onOpenChange,
}: AccountCreateTileProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  return (
    <motion.div
      layout
      transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="card-surface edge flex flex-col gap-3 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="cap-neon">Add account</span>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => onOpenChange(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xs text-fg-muted transition-colors hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <AccountCreateForm onCreated={() => onOpenChange(false)} />
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            type="button"
            onClick={() => onOpenChange(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{
              y: -2,
              boxShadow: "var(--shadow-neon-edge)",
              transition: { duration: 0.15, ease: "easeOut" },
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex min-h-[280px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-white/12 border-dashed bg-transparent p-4 text-center focus-visible:outline-2 focus-visible:outline-[var(--color-cyan)] focus-visible:outline-offset-2"
          >
            <Plus className="h-5 w-5 text-cyan" aria-hidden="true" />
            <span className="cap-neon">Add account</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

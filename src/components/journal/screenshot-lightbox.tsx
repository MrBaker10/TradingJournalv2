"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ScreenshotLightboxProps {
  url: string | null;
  onClose: () => void;
}

// No existing lightbox/modal pattern in the project — the account switcher's
// dropdown (src/components/shell/account-switcher.tsx) is an anchored
// portal, not a full-viewport overlay. This one is new: a dimmed backdrop,
// centered image, closes on backdrop click or Escape.
export function ScreenshotLightbox({ url, onClose }: ScreenshotLightboxProps) {
  // document.body doesn't exist during the server render, and url is always
  // null there anyway (it only ever becomes non-null from a client click) —
  // deferring the portal to after mount keeps the first client render
  // matching the server's and avoids touching `document` before it exists.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!url) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [url, onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    // Only the backdrop itself closes the lightbox — a click that bubbles up
    // from the image must not.
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {url && (
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          {/* biome-ignore lint/performance/noImgElement: signed local-storage URL, not something next/image can optimize */}
          <img
            src={url}
            alt=""
            className="max-h-full max-w-full rounded-xs object-contain shadow-[var(--shadow-card)]"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The toast viewport runs Sonner `unstyled` (src/components/ui/toast.tsx):
// Sonner keeps stacking, timing and the live region, the look is ours. A
// direct `toast.error` or `toast.success` therefore renders as bare text with
// no surface, clipped at the right edge — which is how the ledger and the
// account editor showed their toasts until fix/unstyled-toasts. Every toast
// goes through `notifyProcess` or `notifyError` instead, and the one way to
// keep that true is that nothing else imports Sonner.
//
// Like reduced-motion.test.ts, this asserts the mechanism, because the look
// itself cannot be observed from the test runner.

const SRC = join(process.cwd(), "src");
const TOAST_MODULE = "src/components/ui/toast.tsx";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("toasts, Design.md §4.11", () => {
  it("are raised only through src/components/ui/toast.tsx", () => {
    const importers = sourceFiles(SRC)
      .filter((path) => /from ["']sonner["']/.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path));

    expect(importers).toEqual([TOAST_MODULE]);
  });
});

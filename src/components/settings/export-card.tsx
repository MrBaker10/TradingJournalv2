import { Download } from "lucide-react";

// A server component: nothing here is interactive. The download is a plain
// anchor to the route handler, so no client bundle and no JavaScript are
// needed to get the file.
//
// card-surface + edge, never edge-neon: the neon treatment belongs to process
// values (Design.md §1). An export is neither process nor money.
export function ExportCard() {
  return (
    <div className="flex flex-col gap-3">
      <span className="cap">Data</span>
      <div className="card-surface edge flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-fg text-sm">Export journal</span>
          <span className="text-fg-subtle text-xs">
            Every trade and missed setup as CSV, including practice accounts —
            not the current view.
          </span>
        </div>
        <a
          href="/api/export/trades"
          download
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-fg text-sm transition duration-200 hover:-translate-y-px hover:border-cyan/35 hover:brightness-110 active:scale-[.978]"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download CSV
        </a>
      </div>
    </div>
  );
}

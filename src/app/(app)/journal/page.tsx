import Link from "next/link";

export default function JournalPage() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="page-title">Trade Journal</h1>
      <Link
        href="/journal/new"
        className="flex h-10 items-center rounded-ctl bg-[image:var(--gradient-info)] px-4 text-sm font-medium text-fg shadow-[var(--shadow-button-primary)]"
      >
        New trade
      </Link>
    </div>
  );
}

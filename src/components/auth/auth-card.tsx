import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

// Design.md §4.19: one card, centred, with the brand from §4.1 on top. No
// sidebar — nothing it would link to is reachable before signing in.
export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="card-surface edge flex w-full max-w-[400px] flex-col gap-6 p-7">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 shrink-0 rounded-xs bg-[image:var(--gradient-info)] shadow-[var(--shadow-neon)]" />
          <span className="cap">Trading Journal</span>
        </div>
        <h1 className="page-title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

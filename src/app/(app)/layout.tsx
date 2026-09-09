import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex gap-6 px-6 py-6">
      <Sidebar displayName={user.displayName} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

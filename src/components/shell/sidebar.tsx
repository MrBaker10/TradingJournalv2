import { AccountSwitcher, type SwitcherAccount } from "./account-switcher";
import { SidebarContent } from "./sidebar-content";

/** What the app shell needs from the layout, for sidebar and mobile shell alike. */
export interface ShellProps {
  displayName: string;
  accounts: SwitcherAccount[];
  selectedAccountId: number | null;
}

/** The desktop sidebar; below `lg` the mobile shell shows the same content in a drawer. */
export function Sidebar({
  displayName,
  accounts,
  selectedAccountId,
}: ShellProps) {
  return (
    <aside className="card-surface edge sticky top-6 hidden h-[calc(100vh-48px)] w-[260px] shrink-0 flex-col overflow-y-auto lg:flex">
      <SidebarContent displayName={displayName}>
        <AccountSwitcher
          accounts={accounts}
          selectedAccountId={selectedAccountId}
        />
      </SidebarContent>
    </aside>
  );
}

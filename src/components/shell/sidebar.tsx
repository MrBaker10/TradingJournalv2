import { SidebarContent, type SidebarContentProps } from "./sidebar-content";

/** The desktop sidebar; below `lg` the mobile shell shows the same content in a drawer. */
export function Sidebar(props: SidebarContentProps) {
  return (
    <aside className="card-surface edge sticky top-6 hidden h-[calc(100vh-48px)] w-[260px] shrink-0 flex-col overflow-y-auto lg:flex">
      <SidebarContent {...props} />
    </aside>
  );
}

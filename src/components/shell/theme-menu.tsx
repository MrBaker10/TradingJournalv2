"use client";

import type { RefObject } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemePick } from "@/hooks/use-theme-pick";
import { isThemePick, THEME_PICKS, type ThemePick } from "@/lib/theme";
import { RailTip, SIDEBAR_ICON_BUTTON_CLASS } from "./sidebar-parts";
import { THEME_OPTIONS } from "./theme-options";

/**
 * The theme switch in the sidebar footer, beside "Sign out" (Design.md §3.1):
 * the icon shows the current pick, the menu is a radio group that marks it.
 * Base UI returns focus to the button when the menu closes.
 */
export function ThemeMenu({
  theme,
  collapsed,
  container,
}: {
  theme: ThemePick;
  collapsed: boolean;
  /**
   * Where the menu portals to. The mobile drawer is a modal <dialog> in the
   * top layer, so a menu in <body> would sit behind it.
   */
  container?: RefObject<HTMLElement | null>;
}) {
  const { pick, choose } = useThemePick(theme);
  const { label, icon: Icon } = THEME_OPTIONS[pick];

  return (
    <DropdownMenu>
      <RailTip collapsed={collapsed} label={`Theme: ${label}`}>
        <DropdownMenuTrigger
          aria-label={`Theme: ${label}`}
          className={`${SIDEBAR_ICON_BUTTON_CLASS} data-[popup-open]:bg-sidebar-accent`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
      </RailTip>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        className="w-auto min-w-36"
        container={container}
      >
        <DropdownMenuRadioGroup
          value={pick}
          onValueChange={(value: string) => {
            if (isThemePick(value)) choose(value);
          }}
        >
          {/* Radio items keep a menu open by default; picking is the whole
              job of this menu, so it closes. */}
          {THEME_PICKS.map((value) => {
            const { label: itemLabel, icon: ItemIcon } = THEME_OPTIONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <ItemIcon aria-hidden="true" />
                {itemLabel}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

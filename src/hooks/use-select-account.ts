"use client";

import { useTransition } from "react";
import { setSelectedAccount } from "@/actions/accounts";

/** Selects an account for every page; `pending` until the layout re-rendered. */
export function useSelectAccount() {
  const [pending, startTransition] = useTransition();
  function select(accountId: number | null) {
    startTransition(async () => {
      await setSelectedAccount({ accountId });
    });
  }
  return { pending, select };
}

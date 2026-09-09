"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { hardDeleteAccount, unarchiveAccount } from "@/actions/accounts";
import { InlineMessage } from "@/components/ui/inline-message";

const CONFIRM_TIMEOUT_MS = 3000;

export interface ArchivedAccountData {
  id: number;
  name: string;
  archivedAt: Date;
}

interface ArchivedAccountRowProps {
  account: ArchivedAccountData;
}

function ArchivedAccountRow({ account }: ArchivedAccountRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    };
  }, []);

  function handleRestoreClick() {
    startTransition(async () => {
      const result = await unarchiveAccount({ accountId: account.id });
      if (!result.success) setError(result.error);
    });
  }

  function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      confirmTimeout.current = setTimeout(
        () => setConfirmingDelete(false),
        CONFIRM_TIMEOUT_MS,
      );
      return;
    }

    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    setConfirmingDelete(false);
    startTransition(async () => {
      const result = await hardDeleteAccount({ accountId: account.id });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-ctl border border-white/8 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col">
          <span className="truncate text-sm text-fg-muted">{account.name}</span>
          <span className="text-xs text-fg-subtle">
            Archived {account.archivedAt.toLocaleDateString()}
          </span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleRestoreClick}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xs px-2 text-xs text-fg-subtle transition-colors hover:text-cyan"
        >
          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
          Restore
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDeleteClick}
          className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xs px-2 text-xs transition-colors ${
            confirmingDelete
              ? "bg-[rgba(227,26,26,.16)] text-danger-fg"
              : "text-fg-subtle hover:text-danger-fg"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {confirmingDelete ? "Confirm delete" : "Delete permanently"}
        </button>
      </div>
      <InlineMessage message={error} />
    </div>
  );
}

interface ArchivedAccountsListProps {
  accounts: ArchivedAccountData[];
}

export function ArchivedAccountsList({ accounts }: ArchivedAccountsListProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="cap">Archived</span>
      {accounts.map((account) => (
        <ArchivedAccountRow key={account.id} account={account} />
      ))}
    </div>
  );
}

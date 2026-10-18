"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { DISCARD_ACCOUNT_CHANGES } from "@/hooks/use-unsaved-account";
import type { InstrumentOption } from "./account-commission-rates";
import { AccountForm } from "./account-create-form";
import { AccountCreateTile } from "./account-create-tile";
import { AccountRow, type AccountRowData } from "./account-row";
import {
  type ArchivedAccountData,
  ArchivedAccountsList,
} from "./archived-accounts-list";

interface AccountsManagerProps {
  active: AccountRowData[];
  archived: ArchivedAccountData[];
  instruments: InstrumentOption[];
  timeZone: string;
}

// The inline editor expands like the commission disclosure inside it.
const EDITOR_MOTION = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.3, ease: [0.2, 0.7, 0.3, 1] },
} as const;

export function AccountsManager({
  active,
  archived,
  instruments,
  timeZone,
}: AccountsManagerProps) {
  const [editor, setEditor] = useState<number | "new" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function close() {
    const previous = editor;
    setEditor(null);
    setDirty(false);
    setPending(false);
    requestAnimationFrame(() => {
      const target =
        previous === "new"
          ? rootRef.current?.querySelector<HTMLButtonElement>("button")
          : rootRef.current?.querySelector<HTMLButtonElement>(
              `[data-account-id="${previous}"] button`,
            );
      target?.focus();
    });
  }
  function open(next: typeof editor) {
    if (pending || next === editor) return;
    if (dirty && !window.confirm(DISCARD_ACCOUNT_CHANGES)) return;
    if (next === null) {
      close();
      return;
    }
    setDirty(false);
    setEditor(next);
  }
  const formProps = {
    instruments,
    onClose: () => open(null),
    onSaved: close,
    onDirtyChange: setDirty,
    onPendingChange: setPending,
  };

  return (
    <div ref={rootRef} className="flex max-w-4xl flex-col gap-6">
      <section
        aria-labelledby="accounts-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="accounts-heading" className="text-lg font-medium text-fg">
              Accounts
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Manage your trading accounts and their settings.
            </p>
          </div>
          <AccountCreateTile
            onOpenChange={() => open("new")}
            disabled={pending || editor === "new"}
          />
        </div>
        <AnimatePresence initial={false}>
          {editor === "new" && (
            <motion.div
              key="new"
              {...EDITOR_MOTION}
              className="card-surface edge overflow-hidden"
            >
              <AccountForm {...formProps} />
            </motion.div>
          )}
        </AnimatePresence>
        {active.length === 0 && editor !== "new" && (
          <div className="rounded-ctl border border-dashed border-white/12 p-8 text-center">
            <p className="text-sm text-fg">No active accounts</p>
            <p className="mt-2 text-sm text-fg-muted">
              Add an account to start logging your trades.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {active.map((account, index) => (
            <div
              key={account.id}
              data-account-id={account.id}
              className="card-surface edge overflow-hidden"
            >
              <AccountRow
                account={account}
                isFirst={index === 0}
                isLast={index === active.length - 1}
                disabled={editor !== null}
                pending={pending}
                onEdit={() => open(account.id)}
              />
              <AnimatePresence initial={false}>
                {editor === account.id && (
                  <motion.div
                    key={account.id}
                    {...EDITOR_MOTION}
                    className="overflow-hidden"
                  >
                    <AccountForm account={account} {...formProps} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
      <fieldset
        disabled={editor !== null}
        className="min-w-0 disabled:opacity-50"
      >
        <ArchivedAccountsList accounts={archived} timeZone={timeZone} />
      </fieldset>
    </div>
  );
}

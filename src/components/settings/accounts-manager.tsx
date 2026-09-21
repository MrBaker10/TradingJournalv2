"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AccountCreateTile } from "@/components/settings/account-create-tile";
import type { AccountRowData } from "@/components/settings/account-row";
import { AccountRow } from "@/components/settings/account-row";
import type { ArchivedAccountData } from "@/components/settings/archived-accounts-list";
import { ArchivedAccountsList } from "@/components/settings/archived-accounts-list";

interface AccountsManagerProps {
  active: AccountRowData[];
  archived: ArchivedAccountData[];
  timeZone: string;
}

export function AccountsManager({
  active,
  archived,
  timeZone,
}: AccountsManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="cap">Accounts</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
          <AnimatePresence initial={false}>
            {active.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
              >
                <AccountRow
                  account={account}
                  isFirst={index === 0}
                  isLast={index === active.length - 1}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <AccountCreateTile
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
          />
        </div>
      </div>
      <ArchivedAccountsList accounts={archived} timeZone={timeZone} />
    </div>
  );
}

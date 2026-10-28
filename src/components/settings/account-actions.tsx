"use client";

import { ArchiveRestore, ArrowDown, ArrowUp } from "lucide-react";
import { useTransition } from "react";
import {
  archiveAccount,
  hardDeleteAccount,
  moveAccount,
  setDefaultAccount,
  unarchiveAccount,
} from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import { useTwoClickConfirm } from "@/hooks/use-two-click-confirm";
import { PART_HEADING } from "./fields";
import { ROW_ACTION, SettingsRow } from "./settings-row";

type ActionResult = { success: true } | { success: false; error: string };

/** Runs one account action and confirms it as the action (Design.md §3.11). */
function useAccountAction() {
  const [isPending, startTransition] = useTransition();
  function run(
    action: () => Promise<ActionResult>,
    done: string,
    onDone?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          notifyError(result.error);
          return;
        }
        notifyProcess(done);
        onDone?.();
      } catch {
        notifyError("Couldn't update the account. Try again.");
      }
    });
  }
  return { isPending, run };
}

/**
 * The account's own actions under the editor: they take effect at once and
 * are not part of the draft. Archiving keeps the sheet on the account, which
 * then shows its archived actions.
 */
export function ActiveAccountActions({
  accountId,
  isDefault,
  isFirst,
  isLast,
  /** Archiving swaps the editor away; a dirty draft must agree first. */
  confirmDiscard,
}: {
  accountId: number;
  isDefault: boolean;
  isFirst: boolean;
  isLast: boolean;
  confirmDiscard: () => boolean;
}) {
  const { isPending, run } = useAccountAction();
  const archiveConfirm = useTwoClickConfirm();

  return (
    <section
      aria-labelledby="account-actions"
      className="flex flex-col border-t pt-6"
    >
      <h3 id="account-actions" className={PART_HEADING}>
        Account
      </h3>
      <div className="flex flex-col divide-y">
        <SettingsRow
          title="Default for new trades"
          hint={
            isDefault
              ? "New trades start with this account."
              : "New trades start with another account."
          }
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={ROW_ACTION}
                disabled={isPending || isDefault}
                onClick={() =>
                  run(
                    () => setDefaultAccount({ accountId }),
                    "Default account set",
                  )
                }
              >
                {isDefault ? "Default" : "Make default"}
              </Button>
            </div>
          }
        />
        <SettingsRow
          title="Order"
          hint="The order of the account selector and every account list."
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-10"
                aria-label="Move account up"
                disabled={isPending || isFirst}
                onClick={() =>
                  run(
                    () => moveAccount({ accountId, direction: "up" }),
                    "Account moved",
                  )
                }
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-10"
                aria-label="Move account down"
                disabled={isPending || isLast}
                onClick={() =>
                  run(
                    () => moveAccount({ accountId, direction: "down" }),
                    "Account moved",
                  )
                }
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </div>
          }
        />
        <SettingsRow
          title="Archive"
          hint="Hidden from new trades and the selector. Its trades are kept."
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={ROW_ACTION}
                disabled={isPending}
                onClick={() =>
                  archiveConfirm.press(() => {
                    if (!confirmDiscard()) return;
                    run(
                      () => archiveAccount({ accountId }),
                      "Account archived",
                    );
                  })
                }
              >
                {archiveConfirm.armed ? "Confirm archive" : "Archive account"}
              </Button>
            </div>
          }
        />
      </div>
    </section>
  );
}

/** An archived account in the sheet: restore it, or delete it if unused. */
export function ArchivedAccountActions({
  accountId,
  inUse,
  onDeleted,
}: {
  accountId: number;
  /** Trades or ledger entries point at it: it can only stay archived. */
  inUse: boolean;
  /** The account is gone, so the sheet's parameter must go too. */
  onDeleted: () => void;
}) {
  const { isPending, run } = useAccountAction();
  const deleteConfirm = useTwoClickConfirm();

  return (
    <div className="flex flex-col divide-y">
      <SettingsRow
        title="Restore"
        hint="Back in the selector and the accounts table."
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={ROW_ACTION}
              disabled={isPending}
              onClick={() =>
                run(() => unarchiveAccount({ accountId }), "Account restored")
              }
            >
              <ArchiveRestore aria-hidden="true" />
              Restore account
            </Button>
          </div>
        }
      />
      <SettingsRow
        title="Delete permanently"
        hint={
          inUse
            ? "Has trades or ledger entries, so it stays archived."
            : "Removes the account and its settings. Cannot be undone."
        }
        action={
          <div className="flex gap-2">
            {!inUse && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={`${ROW_ACTION} border-negative/50 text-negative hover:bg-negative/10 hover:text-negative`}
                disabled={isPending}
                onClick={() =>
                  deleteConfirm.press(() =>
                    run(
                      () => hardDeleteAccount({ accountId }),
                      "Account deleted",
                      onDeleted,
                    ),
                  )
                }
              >
                {deleteConfirm.armed ? "Confirm delete" : "Delete permanently"}
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { authClient } from "@/lib/auth/auth-client";
import { ROW_ACTION, SettingsRow } from "./settings-row";

// The danger zone of Design.md §3.8, set apart in `negative`: the first click
// asks for the password, the second deletes. No window.confirm. The button is
// outlined, never filled red: a red surface means a loss in this app.
export function DeleteAccountCard() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter your password to delete your account.");
      return;
    }

    startTransition(async () => {
      const { error: deleteError } = await authClient.deleteUser({ password });
      if (deleteError) {
        setError(
          deleteError.code === "INVALID_PASSWORD"
            ? "That password is wrong."
            : "Couldn't delete the account. Nothing was removed — try again.",
        );
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <SettingsRow
      className="rounded-xl border border-negative/40 px-4"
      title="Delete account"
      hint="Removes your account, every trade and missed setup, your accounts, ledger, notes, badges and screenshots. This cannot be undone — export your journal first if you want to keep it."
      action={
        !armed && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setArmed(true)}
            className={`${ROW_ACTION} border-negative/50 text-negative hover:bg-negative/10 hover:text-negative`}
          >
            Delete account…
          </Button>
        )
      }
    >
      {armed && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-sm flex-col gap-2"
          noValidate
        >
          <AuthField
            label="Your password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            message={error}
            disabled={isPending}
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={isPending}
              className={`${ROW_ACTION} relative border-negative/60 text-negative hover:bg-negative/10 hover:text-negative`}
            >
              <span className={isPending ? "opacity-0" : "opacity-100"}>
                Delete account and all data
              </span>
              {isPending && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <PendingIndicator label="Deleting…" />
                </span>
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setPassword("");
                setError(null);
              }}
              disabled={isPending}
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </SettingsRow>
  );
}

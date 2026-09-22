"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { authClient } from "@/lib/auth/auth-client";

// Design.md §4.19: two steps inside the card, like "Remove" in the import
// batch list — the first click asks for the password, the second deletes.
// No window.confirm. The edge turns red, the button is never filled red:
// a red surface means a loss in this app, not a warning.
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
    <div
      className={`card-surface edge flex flex-col gap-4 border p-5 transition-colors duration-200 ${
        armed ? "border-danger-fg/60" : "border-transparent"
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium text-fg text-sm">Delete account</span>
        <span className="text-fg-subtle text-xs">
          Removes your account, every trade and missed setup, your accounts,
          notes, badges and screenshots. This cannot be undone — export your
          journal first if you want to keep it.
        </span>
      </div>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="flex h-10 w-fit items-center justify-center rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-danger-fg text-sm transition duration-200 hover:border-danger-fg/60"
        >
          Delete account
        </button>
      ) : (
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
            <button
              type="submit"
              disabled={isPending}
              className="relative flex h-10 items-center justify-center rounded-ctl border border-danger-fg/60 bg-white/5 px-4 font-medium text-danger-fg text-sm transition duration-200 hover:brightness-110"
            >
              <span className={isPending ? "opacity-0" : "opacity-100"}>
                Delete account and all data
              </span>
              {isPending && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <PendingIndicator label="Deleting…" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setPassword("");
                setError(null);
              }}
              disabled={isPending}
              className="text-fg-muted text-sm hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

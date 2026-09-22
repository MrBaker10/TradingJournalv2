"use client";

import { useState, useTransition } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { authClient } from "@/lib/auth/auth-client";
import { changePasswordSchema } from "@/schemas/auth";

const SUCCESS_HOLD_MS = 800;

type Field = "currentPassword" | "newPassword" | "confirmPassword";

export function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(field: Field, value: string) {
    setValues({ ...values, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
    if (formError) setFormError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as Field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Any other device still signed in with the old password is signed
        // out; this one keeps its session.
        revokeOtherSessions: true,
      });
      if (error) {
        if (error.code === "INVALID_PASSWORD") {
          setErrors({ currentPassword: "That isn't your current password." });
        } else {
          setFormError("Couldn't change the password. Try again.");
        }
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        setValues({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }, SUCCESS_HOLD_MS);
    });
  }

  return (
    <div className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-fg text-sm">Password</span>
          <span className="text-fg-subtle text-xs">
            Changing it signs out every other device.
          </span>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 shrink-0 items-center justify-center rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-fg text-sm transition duration-200 hover:-translate-y-px hover:border-cyan/35 hover:brightness-110 active:scale-[.978]"
          >
            Change password
          </button>
        )}
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-sm flex-col gap-2"
          noValidate
        >
          <AuthField
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={(event) => update("currentPassword", event.target.value)}
            message={errors.currentPassword ?? null}
            disabled={isPending || success}
          />
          <AuthField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(event) => update("newPassword", event.target.value)}
            message={errors.newPassword ?? null}
            disabled={isPending || success}
          />
          <AuthField
            label="Repeat new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            message={errors.confirmPassword ?? formError}
            disabled={isPending || success}
          />
          <div className="flex items-center gap-3">
            <SubmitButton
              loading={isPending}
              success={success ? "Changed" : null}
              pendingLabel="Saving…"
            >
              Change password
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setErrors({});
                setFormError(null);
              }}
              disabled={isPending || success}
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

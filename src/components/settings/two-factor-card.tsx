"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { authClient } from "@/lib/auth/auth-client";
import { withAccountLabel } from "@/lib/auth/totp-label";
import { totpCodeSchema } from "@/schemas/auth";
import { TotpQr } from "./totp-qr";

interface TwoFactorCardProps {
  enabled: boolean;
  /** Shown as the account name in the authenticator app. */
  username: string;
}

// The steps of Design.md §4.19, in one card:
//   idle → password → scan (QR + key + first code) → codes (backup codes, once)
// Turning it off is idle → password-off. Better Auth only sets
// `twoFactorEnabled` after the first code verifies, so a setup abandoned
// half-way leaves 2FA off.
type Step =
  | { kind: "idle" }
  | { kind: "password"; turningOff: boolean }
  | { kind: "scan"; totpURI: string; backupCodes: string[] }
  | { kind: "codes"; backupCodes: string[] };

const GHOST_BUTTON =
  "flex h-10 shrink-0 items-center justify-center rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-fg text-sm transition duration-200 hover:-translate-y-px hover:border-cyan/35 hover:brightness-110 active:scale-[.978]";

/** The shared secret from an otpauth:// URI, for typing it in by hand. */
function secretOf(totpURI: string): string {
  return new URL(totpURI).searchParams.get("secret") ?? "";
}

export function TwoFactorCard({ enabled, username }: TwoFactorCardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep({ kind: "idle" });
    setPassword("");
    setCode("");
    setError(null);
  }

  function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind !== "password") return;
    if (!password) {
      setError("Enter your password.");
      return;
    }

    startTransition(async () => {
      if (step.turningOff) {
        const { error: disableError } = await authClient.twoFactor.disable({
          password,
        });
        if (disableError) {
          setError("That password is wrong.");
          return;
        }
        reset();
        router.refresh();
        return;
      }

      // TOTP only: the "otp" method mails or texts a code, and nothing here
      // sends mail (current-feature.md, "Do not build").
      const { data, error: enableError } = await authClient.twoFactor.enable({
        password,
        method: "totp",
      });
      if (enableError || !data || data.method !== "totp") {
        setError("That password is wrong.");
        return;
      }
      setPassword("");
      setError(null);
      setStep({
        kind: "scan",
        totpURI: withAccountLabel(data.totpURI, username),
        backupCodes: data.backupCodes,
      });
    });
  }

  function handleCode(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind !== "scan") return;
    const parsed = totpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: parsed.data,
      });
      if (verifyError) {
        setError(
          "That code didn't match. Codes change every 30 seconds — try the current one.",
        );
        return;
      }
      setCode("");
      setError(null);
      setStep({ kind: "codes", backupCodes: step.backupCodes });
    });
  }

  return (
    <div className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-fg text-sm">
            Two-factor authentication
            <span className="cap">{enabled ? "On" : "Off"}</span>
          </span>
          <span className="text-fg-subtle text-xs">
            A six-digit code from an authenticator app after your password.
          </span>
        </div>
        {step.kind === "idle" && (
          <button
            type="button"
            onClick={() => setStep({ kind: "password", turningOff: enabled })}
            className={GHOST_BUTTON}
          >
            {enabled ? "Turn off" : "Set up"}
          </button>
        )}
      </div>

      {step.kind === "password" && (
        <form
          onSubmit={handlePassword}
          className="flex max-w-sm flex-col gap-2"
          noValidate
        >
          {/* Without this line the step reads as the whole setup: a lone
              password field gives no hint that the QR code comes next. */}
          <p className="text-fg-muted text-sm">
            {step.turningOff
              ? "Confirm with your password to turn two-factor off."
              : "Step 1 of 2: confirm with your password. The QR code for your authenticator app comes next."}
          </p>
          <AuthField
            label="Confirm with your password"
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
            <SubmitButton loading={isPending} pendingLabel="Checking…">
              {step.turningOff ? "Turn off two-factor" : "Show QR code"}
            </SubmitButton>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="text-fg-muted text-sm hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {step.kind === "scan" && (
        <form
          onSubmit={handleCode}
          className="flex flex-col gap-4 sm:flex-row sm:items-start"
          noValidate
        >
          <TotpQr uri={step.totpURI} />
          <div className="flex max-w-sm flex-1 flex-col gap-3">
            <p className="text-fg-muted text-sm">
              Step 2 of 2: scan the code with your authenticator app, or type
              the key in by hand. Then enter the six digits it shows.
            </p>
            <div className="flex flex-col gap-1">
              <span className="cap">Key</span>
              <code className="break-all font-mono text-fg text-xs tabular-nums tracking-wider">
                {secretOf(step.totpURI)}
              </code>
            </div>
            <AuthField
              label="Authentication code"
              name="code"
              mono
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError(null);
              }}
              message={error}
              disabled={isPending}
            />
            <div className="flex items-center gap-3">
              <SubmitButton loading={isPending} pendingLabel="Checking…">
                Turn on
              </SubmitButton>
              <button
                type="button"
                onClick={reset}
                disabled={isPending}
                className="text-fg-muted text-sm hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {step.kind === "codes" && (
        <div className="flex flex-col gap-3">
          <p className="text-fg-muted text-sm">
            Two-factor is on. Write these backup codes down now — each signs you
            in once if your phone is gone, and they are not shown again.
          </p>
          <ul className="grid max-w-md grid-cols-2 gap-2 rounded-ctl bg-well p-4 font-mono text-fg text-sm tabular-nums sm:grid-cols-3">
            {step.backupCodes.map((backupCode) => (
              <li key={backupCode}>{backupCode}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              reset();
              router.refresh();
            }}
            className={`${GHOST_BUTTON} self-start`}
          >
            I wrote them down
          </button>
        </div>
      )}
    </div>
  );
}

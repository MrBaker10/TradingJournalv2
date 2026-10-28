"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { withAccountLabel } from "@/lib/auth/totp-label";
import { totpCodeSchema } from "@/schemas/auth";
import { ROW_ACTION, SettingsRow } from "./settings-row";
import { TotpQr } from "./totp-qr";

interface TwoFactorCardProps {
  enabled: boolean;
  /** Shown as the account name in the authenticator app. */
  username: string;
  /** The shared demo account: the row shows, its action does not. */
  locked?: boolean;
}

// The two-factor steps (Design-v1.md §4.19), opening below their row:
//   idle → password → scan (QR + key + first code) → codes (backup codes, once)
// Turning it off is idle → password-off. Better Auth only sets
// `twoFactorEnabled` after the first code verifies, so a setup abandoned
// half-way leaves 2FA off.
type Step =
  | { kind: "idle" }
  | { kind: "password"; turningOff: boolean }
  | { kind: "scan"; totpURI: string; backupCodes: string[] }
  | { kind: "codes"; backupCodes: string[] };

/** The shared secret from an otpauth:// URI, for typing it in by hand. */
function secretOf(totpURI: string): string {
  return new URL(totpURI).searchParams.get("secret") ?? "";
}

export function TwoFactorCard({
  enabled,
  username,
  locked = false,
}: TwoFactorCardProps) {
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
    <SettingsRow
      title={
        <span className="flex items-center gap-2">
          Two-factor authentication
          <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {enabled ? "On" : "Off"}
          </span>
        </span>
      }
      hint="A six-digit code from an authenticator app after your password."
      action={
        step.kind === "idle" &&
        !locked && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setStep({ kind: "password", turningOff: enabled })}
            className={ROW_ACTION}
          >
            {enabled ? "Turn off" : "Set up"}
          </Button>
        )
      }
    >
      {step.kind === "password" && (
        <form
          onSubmit={handlePassword}
          className="flex max-w-sm flex-col gap-4"
          noValidate
        >
          {/* Without this line the step reads as the whole setup: a lone
              password field gives no hint that the QR code comes next. */}
          <p className="text-muted-foreground text-sm">
            {step.turningOff
              ? "Confirm with your password to turn two-factor off."
              : "Step 1 of 2: confirm with your password. The QR code for your authenticator app comes next."}
          </p>
          <AuthTextField
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
            error={error}
            disabled={isPending}
          />
          <div className="flex items-center gap-3">
            <AuthSubmit
              pending={isPending}
              pendingLabel="Checking…"
              fullWidth={false}
            >
              {step.turningOff ? "Turn off two-factor" : "Show QR code"}
            </AuthSubmit>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="text-muted-foreground text-sm hover:text-foreground"
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
            <p className="text-muted-foreground text-sm">
              Step 2 of 2: scan the code with your authenticator app, or type
              the key in by hand. Then enter the six digits it shows.
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Key</span>
              <code className="break-all font-mono text-xs tabular-nums tracking-wider">
                {secretOf(step.totpURI)}
              </code>
            </div>
            <AuthTextField
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
              error={error}
              disabled={isPending}
            />
            <div className="flex items-center gap-3">
              <AuthSubmit
                pending={isPending}
                pendingLabel="Checking…"
                fullWidth={false}
              >
                Turn on
              </AuthSubmit>
              <button
                type="button"
                onClick={reset}
                disabled={isPending}
                className="text-muted-foreground text-sm hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {step.kind === "codes" && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Two-factor is on. Write these backup codes down now — each signs you
            in once if your phone is gone, and they are not shown again.
          </p>
          <ul className="grid max-w-md grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4 font-mono text-sm tabular-nums sm:grid-cols-3">
            {step.backupCodes.map((backupCode) => (
              <li key={backupCode}>{backupCode}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              reset();
              router.refresh();
            }}
            className={`${ROW_ACTION} self-start`}
          >
            I wrote them down
          </Button>
        </div>
      )}
    </SettingsRow>
  );
}

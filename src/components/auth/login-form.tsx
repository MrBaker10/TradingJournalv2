"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { backupCodeSchema, signInSchema, totpCodeSchema } from "@/schemas/auth";
import { AuthField } from "./auth-field";
import { SubmitButton } from "./submit-button";

// One sentence for a wrong username and a wrong password alike: splitting it
// by field would tell a stranger which usernames exist (Design.md §4.19).
const SIGN_IN_FAILED = "Username or password is wrong.";

interface LoginFormProps {
  registrationOpen: boolean;
}

export function LoginForm({ registrationOpen }: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [codeKind, setCodeKind] = useState<"totp" | "backup">("totp");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enterJournal() {
    router.replace("/dashboard");
    router.refresh();
  }

  function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signInSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const { data, error: signInError } = await authClient.signIn.username(
        parsed.data,
      );
      if (signInError) {
        setError(
          signInError.status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : SIGN_IN_FAILED,
        );
        return;
      }
      // With 2FA on, the password step only earns the right to the code step;
      // the session starts after the code.
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setError(null);
        setStep("code");
        return;
      }
      enterJournal();
    });
  }

  function handleCode(event: React.FormEvent) {
    event.preventDefault();
    const parsed = (
      codeKind === "totp" ? totpCodeSchema : backupCodeSchema
    ).safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const { error: verifyError } =
        codeKind === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: parsed.data })
          : await authClient.twoFactor.verifyBackupCode({ code: parsed.data });
      if (verifyError) {
        setError(
          codeKind === "totp"
            ? "That code didn't match. Codes change every 30 seconds — try the current one."
            : "That backup code didn't match, or it was used already.",
        );
        return;
      }
      enterJournal();
    });
  }

  if (step === "code") {
    return (
      <form onSubmit={handleCode} className="flex flex-col gap-4" noValidate>
        <p className="text-fg-muted text-sm">
          {codeKind === "totp"
            ? "Enter the six-digit code from your authenticator app."
            : "Enter one of the backup codes you wrote down. Each works once."}
        </p>
        <AuthField
          key={codeKind}
          label={codeKind === "totp" ? "Authentication code" : "Backup code"}
          name="code"
          mono
          autoFocus
          inputMode={codeKind === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
          }}
          message={error}
          disabled={isPending}
        />
        <SubmitButton loading={isPending} pendingLabel="Checking…" fullWidth>
          Verify
        </SubmitButton>
        <button
          type="button"
          onClick={() => {
            setCodeKind(codeKind === "totp" ? "backup" : "totp");
            setCode("");
            setError(null);
          }}
          className="self-start text-cyan text-xs hover:underline"
        >
          {codeKind === "totp"
            ? "Use a backup code instead"
            : "Use the authenticator app instead"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-2" noValidate>
      <AuthField
        label="Username"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        disabled={isPending}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (error) setError(null);
        }}
        message={error}
        disabled={isPending}
      />
      <SubmitButton loading={isPending} pendingLabel="Signing in…" fullWidth>
        Sign in
      </SubmitButton>
      {registrationOpen && (
        <p className="pt-2 text-fg-subtle text-xs">
          No account yet?{" "}
          <Link href="/register" className="text-cyan hover:underline">
            Create account
          </Link>
        </p>
      )}
    </form>
  );
}

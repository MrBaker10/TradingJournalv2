"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { InlineMessage } from "@/components/ui/inline-message";
import { authClient } from "@/lib/auth/auth-client";
import { placeholderEmail } from "@/lib/auth/placeholder-email";
import { signUpSchema } from "@/schemas/auth";
import { AuthField } from "./auth-field";
import { SubmitButton } from "./submit-button";

type FieldErrors = Partial<
  Record<"username" | "displayName" | "password" | "timezone", string>
>;

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The server cannot know the browser's zone, so the default is filled in
  // after mount (project-overview.md: "prefilled from the browser").
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse({
      username,
      displayName,
      password,
      timezone,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        username: parsed.data.username,
        name: parsed.data.displayName,
        password: parsed.data.password,
        timezone: parsed.data.timezone,
        // Better Auth requires an email; the server replaces whatever is sent
        // with this same placeholder (src/lib/auth/auth.ts).
        email: placeholderEmail(parsed.data.username),
      });
      if (error) {
        if (error.code === "USERNAME_IS_ALREADY_TAKEN") {
          setErrors({ username: "That username is taken. Pick another." });
        } else {
          setFormError("Couldn't create the account. Try again.");
        }
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
    if (formError) setFormError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <AuthField
        label="Username"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          clearError("username");
        }}
        message={
          errors.username ?? "This is how you sign in. It can't be changed."
        }
        tone={errors.username ? "error" : "hint"}
        disabled={isPending}
      />
      <AuthField
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => {
          setDisplayName(event.target.value);
          clearError("displayName");
        }}
        message={errors.displayName ?? null}
        disabled={isPending}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearError("password");
        }}
        message={errors.password ?? null}
        disabled={isPending}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="cap">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(event) => {
            setTimezone(event.target.value);
            clearError("timezone");
          }}
          disabled={isPending}
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-sm text-fg transition-colors duration-200 hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
        >
          {timezone === "" && <option value="">Detecting…</option>}
          {(zones.includes(timezone) || timezone === ""
            ? zones
            : [timezone, ...zones]
          ).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <InlineMessage
          message={
            errors.timezone ?? "The clock you sit in front of while trading."
          }
          tone={errors.timezone ? "error" : "hint"}
        />
      </div>
      <SubmitButton loading={isPending} pendingLabel="Creating…" fullWidth>
        Create account
      </SubmitButton>
      <InlineMessage message={formError} />
      <p className="text-fg-subtle text-xs">
        Already have an account?{" "}
        <Link href="/login" className="text-cyan hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

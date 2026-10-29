"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { SELECT_CLASS } from "@/components/settings/fields";
import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { notifyError } from "@/components/ui/toast";
import { useMessage } from "@/hooks/use-message";
import { authClient } from "@/lib/auth/auth-client";
import { placeholderEmail } from "@/lib/auth/placeholder-email";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { signUpSchema } from "@/schemas/auth";
import { AUTH_LINK } from "./auth-card";
import { AuthSubmit } from "./auth-submit";
import { AuthTextField } from "./auth-text-field";

type FieldErrors = Partial<
  Record<"username" | "displayName" | "password" | "timezone", string>
>;

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const message = useMessage();
  const timezoneId = useId();

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
        next[field] ??= message(issue.message);
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
        // The account starts in this page's language (docs/adr/0008).
        language: locale,
        // Better Auth requires an email; the server replaces whatever is sent
        // with this same placeholder (src/lib/auth/auth.ts).
        email: placeholderEmail(parsed.data.username),
      });
      if (error) {
        if (error.code === "USERNAME_IS_ALREADY_TAKEN") {
          setErrors({ username: t("usernameTaken") });
        } else {
          // The form keeps its input; only the attempt failed (Design.md §3.11).
          notifyError(t("createFailed"));
        }
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <AuthTextField
        label={t("username")}
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(event) => {
          setUsername(event.target.value);
          clearError("username");
        }}
        error={errors.username}
        hint={t("usernameHint")}
        disabled={isPending}
      />
      <AuthTextField
        label={t("displayName")}
        name="displayName"
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => {
          setDisplayName(event.target.value);
          clearError("displayName");
        }}
        error={errors.displayName}
        disabled={isPending}
      />
      <AuthTextField
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearError("password");
        }}
        error={errors.password}
        disabled={isPending}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <FieldLabel htmlFor={timezoneId}>{t("timezone")}</FieldLabel>
        <select
          id={timezoneId}
          name="timezone"
          value={timezone}
          onChange={(event) => {
            setTimezone(event.target.value);
            clearError("timezone");
          }}
          disabled={isPending}
          aria-invalid={errors.timezone ? true : undefined}
          aria-describedby={`${timezoneId}-${errors.timezone ? "error" : "hint"}`}
          className={SELECT_CLASS}
        >
          {timezone === "" && (
            <option value="">{t("detectingTimezone")}</option>
          )}
          {(zones.includes(timezone) || timezone === ""
            ? zones
            : [timezone, ...zones]
          ).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {!errors.timezone && (
          <p
            id={`${timezoneId}-hint`}
            className="text-muted-foreground text-xs"
          >
            {t("timezoneHint")}
          </p>
        )}
        <FieldError id={`${timezoneId}-error`} message={errors.timezone} />
      </div>
      <AuthSubmit pending={isPending} pendingLabel={t("creating")}>
        {t("createAccount")}
      </AuthSubmit>
      <p className="text-muted-foreground text-xs">
        {t("haveAccount")}{" "}
        <Link href="/login" className={AUTH_LINK}>
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}

import * as z from "zod";
import { messageKey } from "../lib/i18n/message-keys.ts";

// Client-side validation for the auth forms. The limits are Better Auth
// 1.7.5's own defaults (username plugin: 3–30 characters from [a-zA-Z0-9_.];
// emailAndPassword: 8–128), so the form never accepts what the server would
// then refuse. The server checks again regardless.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, messageKey("validation.usernameTooShort"))
  .max(USERNAME_MAX, messageKey("validation.usernameTooLong"))
  .regex(/^[a-zA-Z0-9_.]+$/, messageKey("validation.usernameCharacters"));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, messageKey("validation.passwordTooShort"))
  .max(PASSWORD_MAX, messageKey("validation.passwordTooLong"));

export const signInSchema = z.object({
  username: z.string().trim().min(1, messageKey("validation.enterUsername")),
  password: z.string().min(1, messageKey("validation.enterPassword")),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, messageKey("validation.enterDisplayName"))
    .max(100),
  password: passwordSchema,
  timezone: z.string().min(1, messageKey("validation.pickTimezone")),
});

/** A TOTP code from the authenticator app: six digits. */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, messageKey("validation.totpFormat"));

/** A backup code as Better Auth issues it. Format checked by the server. */
export const backupCodeSchema = z
  .string()
  .trim()
  .min(1, messageKey("validation.enterBackupCode"));

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, messageKey("validation.enterCurrentPassword")),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: messageKey("validation.passwordsDiffer"),
    path: ["confirmPassword"],
  });

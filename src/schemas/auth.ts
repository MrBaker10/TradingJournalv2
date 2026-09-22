import * as z from "zod";

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
  .min(USERNAME_MIN, `At least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `At most ${USERNAME_MAX} characters.`)
  .regex(
    /^[a-zA-Z0-9_.]+$/,
    "Letters, digits, dots and underscores — nothing else.",
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `At most ${PASSWORD_MAX} characters.`);

export const signInSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Enter a display name.").max(100),
  password: passwordSchema,
  timezone: z.string().min(1, "Pick your timezone."),
});

/** A TOTP code from the authenticator app: six digits. */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Six digits from your authenticator app.");

/** A backup code as Better Auth issues it. Format checked by the server. */
export const backupCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter one of your backup codes.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The two new passwords differ.",
    path: ["confirmPassword"],
  });

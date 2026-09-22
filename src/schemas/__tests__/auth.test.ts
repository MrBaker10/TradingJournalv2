import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  signUpSchema,
  totpCodeSchema,
  usernameSchema,
} from "../auth.ts";

describe("usernameSchema", () => {
  it("accepts what Better Auth's username plugin accepts", () => {
    expect(usernameSchema.safeParse("trader_01.eu").success).toBe(true);
  });

  it("refuses characters the plugin would refuse", () => {
    // Without this the form would submit and the server answer with an
    // error the user cannot connect to what they typed.
    expect(usernameSchema.safeParse("trader-01").success).toBe(false);
    expect(usernameSchema.safeParse("trader 01").success).toBe(false);
  });

  it("holds the plugin's length limits", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
    expect(usernameSchema.safeParse("abc").success).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("requires a password of at least eight characters", () => {
    const result = signUpSchema.safeParse({
      username: "trader",
      displayName: "Trader",
      password: "short",
      timezone: "Europe/Berlin",
    });
    expect(result.success).toBe(false);
  });
});

describe("totpCodeSchema", () => {
  it("takes six digits and nothing else", () => {
    expect(totpCodeSchema.safeParse("123456").success).toBe(true);
    expect(totpCodeSchema.safeParse(" 123456 ").success).toBe(true);
    expect(totpCodeSchema.safeParse("12345").success).toBe(false);
    expect(totpCodeSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("refuses two different new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password-1",
      confirmPassword: "new-password-2",
    });
    expect(result.success).toBe(false);
  });
});

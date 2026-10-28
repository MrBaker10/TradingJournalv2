import { describe, expect, it } from "vitest";
import { refusedOnDemo, signsUpAsDemo } from "../demo-guard.ts";

describe("refusedOnDemo", () => {
  it("refuses the account-security endpoints", () => {
    for (const path of [
      "/change-password",
      "/two-factor/enable",
      "/two-factor/disable",
      "/delete-user",
      "/revoke-session",
      "/revoke-sessions",
      "/revoke-other-sessions",
    ]) {
      expect(refusedOnDemo(path), path).toBe(true);
    }
  });

  it("leaves signing in, the session and the profile open", () => {
    for (const path of [
      "/sign-in/username",
      "/sign-out",
      "/get-session",
      "/two-factor/verify-totp",
      "/update-user",
    ]) {
      expect(refusedOnDemo(path), path).toBe(false);
    }
  });
});

describe("signsUpAsDemo", () => {
  it("catches a sign-up for the demo name in any case", () => {
    expect(signsUpAsDemo("/sign-up/email", { username: "demo" })).toBe(true);
    expect(signsUpAsDemo("/sign-up/email", { username: "Demo " })).toBe(true);
  });

  it("catches the display name alone, which the username plugin copies into the username after this check", () => {
    expect(signsUpAsDemo("/sign-up/email", { displayUsername: "Demo" })).toBe(
      true,
    );
  });

  it("lets every other sign-up and every other path through", () => {
    expect(signsUpAsDemo("/sign-up/email", { username: "demo2" })).toBe(false);
    expect(signsUpAsDemo("/sign-up/email", {})).toBe(false);
    expect(signsUpAsDemo("/sign-up/email", undefined)).toBe(false);
    expect(signsUpAsDemo("/sign-in/username", { username: "demo" })).toBe(
      false,
    );
  });
});

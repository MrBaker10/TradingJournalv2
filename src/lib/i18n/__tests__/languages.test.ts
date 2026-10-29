import { describe, expect, it } from "vitest";
import {
  isLanguage,
  type LanguageRequest,
  languageFromAcceptHeader,
  languageOfPath,
  registrationLanguage,
  resolveLanguage,
  storedLanguageOf,
  withLanguage,
} from "../languages";

const signedOut: LanguageRequest = {
  pathname: "/journal",
  storedLanguage: null,
  cookie: undefined,
  acceptLanguage: undefined,
};

describe("resolveLanguage, docs/adr/0008", () => {
  it("renders a prefixed path in its language, whatever is stored, set or preferred", () => {
    expect(
      resolveLanguage({
        pathname: "/en/journal",
        storedLanguage: "de",
        cookie: "de",
        acceptLanguage: "de",
      }),
    ).toEqual({ kind: "render", language: "en" });
    expect(resolveLanguage({ ...signedOut, pathname: "/de" })).toEqual({
      kind: "render",
      language: "de",
    });
  });

  it("sends a signed-in user on an unprefixed path to the stored language", () => {
    expect(
      resolveLanguage({
        pathname: "/journal",
        storedLanguage: "de",
        cookie: "en",
        acceptLanguage: "en-US",
      }),
    ).toEqual({ kind: "redirect", pathname: "/de/journal" });
  });

  it("lands after sign-in in the stored language", () => {
    expect(
      resolveLanguage({
        ...signedOut,
        pathname: "/dashboard",
        storedLanguage: "de",
      }),
    ).toEqual({ kind: "redirect", pathname: "/de/dashboard" });
  });

  it("uses the cookie when signed out, before the browser", () => {
    expect(
      resolveLanguage({ ...signedOut, cookie: "de", acceptLanguage: "en" }),
    ).toEqual({ kind: "redirect", pathname: "/de/journal" });
  });

  it("ignores an unknown cookie value", () => {
    expect(
      resolveLanguage({ ...signedOut, cookie: "fr", acceptLanguage: "de" }),
    ).toEqual({ kind: "redirect", pathname: "/de/journal" });
  });

  it("uses the browser's preference without a cookie", () => {
    expect(
      resolveLanguage({ ...signedOut, acceptLanguage: "de-AT,de;q=0.9" }),
    ).toEqual({ kind: "redirect", pathname: "/de/journal" });
  });

  it("falls back to English when nothing names a language of ours", () => {
    expect(resolveLanguage(signedOut)).toEqual({
      kind: "redirect",
      pathname: "/en/journal",
    });
    expect(
      resolveLanguage({ ...signedOut, acceptLanguage: "fr-FR,fr" }),
    ).toEqual({
      kind: "redirect",
      pathname: "/en/journal",
    });
  });

  it("treats an unknown prefix as part of the path", () => {
    expect(resolveLanguage({ ...signedOut, pathname: "/fr/journal" })).toEqual({
      kind: "redirect",
      pathname: "/en/fr/journal",
    });
    expect(resolveLanguage({ ...signedOut, pathname: "/DE/journal" })).toEqual({
      kind: "redirect",
      pathname: "/en/DE/journal",
    });
  });

  it("redirects the front page to the bare prefix", () => {
    expect(
      resolveLanguage({ ...signedOut, pathname: "/", acceptLanguage: "de" }),
    ).toEqual({ kind: "redirect", pathname: "/de" });
  });
});

describe("languageFromAcceptHeader", () => {
  it("picks the highest quality among our languages", () => {
    expect(languageFromAcceptHeader("fr;q=0.9,de;q=0.8,en;q=0.7")).toBe("de");
    expect(languageFromAcceptHeader("en;q=0.5,de;q=0.8")).toBe("de");
  });

  it("keeps header order on equal quality", () => {
    expect(languageFromAcceptHeader("en-GB,de")).toBe("en");
    expect(languageFromAcceptHeader("de-CH, en")).toBe("de");
  });

  it("skips q=0, malformed quality and unknown languages", () => {
    expect(languageFromAcceptHeader("de;q=0,en;q=0.1")).toBe("en");
    expect(languageFromAcceptHeader("de;q=abc,en")).toBe("en");
    expect(languageFromAcceptHeader("*")).toBeNull();
    expect(languageFromAcceptHeader("")).toBeNull();
    expect(languageFromAcceptHeader(null)).toBeNull();
  });

  it("matches the primary subtag case-insensitively", () => {
    expect(languageFromAcceptHeader("DE-de")).toBe("de");
  });
});

describe("path helpers", () => {
  it("reads the prefix only from the first segment, exactly", () => {
    expect(languageOfPath("/de/journal")).toBe("de");
    expect(languageOfPath("/en")).toBe("en");
    expect(languageOfPath("/journal/de")).toBeNull();
    expect(languageOfPath("/den")).toBeNull();
    expect(languageOfPath("/")).toBeNull();
  });

  it("prefixes a path, the front page without a trailing slash", () => {
    expect(withLanguage("de", "/")).toBe("/de");
    expect(withLanguage("en", "/journal/7/edit")).toBe("/en/journal/7/edit");
  });

  it("accepts only our languages", () => {
    expect(isLanguage("de")).toBe(true);
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});

describe("storedLanguageOf, the demo exception of docs/adr/0008", () => {
  it("reads a user's stored language", () => {
    expect(storedLanguageOf({ username: "trader", language: "de" })).toBe("de");
    expect(storedLanguageOf({ username: "trader", language: "en" })).toBe("en");
  });

  it("has none for the demo user, in any spelling, so the cookie decides", () => {
    expect(storedLanguageOf({ username: "demo", language: "en" })).toBeNull();
    expect(storedLanguageOf({ username: "Demo", language: "de" })).toBeNull();
  });

  it("has none for a missing or unknown value", () => {
    expect(
      storedLanguageOf({ username: "trader", language: undefined }),
    ).toBeNull();
    expect(storedLanguageOf({ username: "trader", language: "fr" })).toBeNull();
  });
});

describe("registrationLanguage", () => {
  it("keeps the language of the registration page", () => {
    expect(registrationLanguage("de")).toBe("de");
    expect(registrationLanguage("en")).toBe("en");
  });

  it("falls back to English for anything a client could send instead", () => {
    for (const value of [undefined, null, "", "fr", "DE", 1, {}]) {
      expect(registrationLanguage(value)).toBe("en");
    }
  });
});

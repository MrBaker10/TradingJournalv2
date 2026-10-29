import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DEMO_USERNAME } from "../../../domain/demo.ts";
import { db } from "../../index.ts";
import { users } from "../../schema/users.ts";
import {
  InterfaceLanguageError,
  saveInterfaceLanguage,
} from "../interface-language.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface Fixture {
  tx: Tx;
  userId: number;
  otherUserId: number;
}

// Rolled back like the other query tests: nothing here is ever committed.
async function fixture(body: (f: Fixture) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "interface-language-test",
            email: "interface-language-test@users.invalid",
            displayName: "Interface language test",
            timezone: "Europe/Berlin",
          },
          {
            username: "interface-language-test-other",
            email: "interface-language-test-other@users.invalid",
            displayName: "Interface language other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      await body({ tx, userId: user.id, otherUserId: other.id });
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

async function languageOf(f: Fixture, userId: number) {
  const [row] = await f.tx
    .select({ language: users.language })
    .from(users)
    .where(eq(users.id, userId));
  return row?.language;
}

describe("users.language, docs/adr/0008", () => {
  it("starts in English for a user created without one", async () => {
    await fixture(async (f) => {
      expect(await languageOf(f, f.userId)).toBe("en");
    });
  });

  it("refuses a value outside the languages in the database itself", async () => {
    await fixture(async (f) => {
      const error = await f.tx
        .execute(sql`update users set language = 'fr' where id = ${f.userId}`)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(String((error as Error).cause ?? error)).toContain(
        "users_language_check",
      );
    });
  });
});

describe("saveInterfaceLanguage", () => {
  it("writes the user's own row and no other", async () => {
    await fixture(async (f) => {
      expect(await saveInterfaceLanguage(f.userId, "de", f.tx)).toBe("saved");
      expect(await languageOf(f, f.userId)).toBe("de");
      expect(await languageOf(f, f.otherUserId)).toBe("en");
    });
  });

  it("refuses a language that does not exist and leaves the row", async () => {
    await fixture(async (f) => {
      for (const value of ["fr", "DE", "", null, 1]) {
        await expect(
          saveInterfaceLanguage(f.userId, value, f.tx),
        ).rejects.toBeInstanceOf(InterfaceLanguageError);
      }
      expect(await languageOf(f, f.userId)).toBe("en");
    });
  });

  it("never writes the demo user's row", async () => {
    await fixture(async (f) => {
      const [demo] = await f.tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, DEMO_USERNAME));
      const demoId =
        demo?.id ??
        (
          await f.tx
            .insert(users)
            .values({
              username: DEMO_USERNAME,
              email: `${DEMO_USERNAME}@users.invalid`,
              displayName: "Demo",
              timezone: "Europe/Berlin",
            })
            .returning({ id: users.id })
        )[0].id;
      const before = await languageOf(f, demoId);
      expect(await saveInterfaceLanguage(demoId, "de", f.tx)).toBe("demo");
      expect(await languageOf(f, demoId)).toBe(before);
    });
  });
});

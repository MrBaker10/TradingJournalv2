import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { users } from "../../schema/users.ts";
import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklistItems,
  renameChecklistItem,
} from "../checklist.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fixture(
  body: (tx: Tx, userId: number, otherUserId: number) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "checklist-test",
            email: "checklist-test@users.invalid",
            displayName: "Checklist test",
            timezone: "Europe/Berlin",
          },
          {
            username: "checklist-test-other",
            email: "checklist-test-other@users.invalid",
            displayName: "Checklist other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      await body(tx, user.id, other.id);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

describe("checklist template", () => {
  it("starts empty and persists steps in insertion order within every phase", async () => {
    await fixture(async (tx, userId) => {
      expect(await listChecklistItems(userId, tx)).toEqual([]);
      for (const phase of ["premarket", "trading", "review"] as const) {
        await createChecklistItem(
          userId,
          { phase, text: "  First step  " },
          tx,
        );
        await createChecklistItem(userId, { phase, text: "Second step" }, tx);
      }
      const items = await listChecklistItems(userId, tx);
      for (const phase of ["premarket", "trading", "review"]) {
        expect(
          items.filter((item) => item.phase === phase).map((item) => item.text),
        ).toEqual(["First step", "Second step"]);
      }
    });
  });
});

it("rejects the 21st step per phase without affecting other phases or users", async () => {
  await fixture(async (tx, userId, otherUserId) => {
    for (let i = 0; i < 20; i++)
      await createChecklistItem(
        userId,
        { phase: "premarket", text: `Step ${i}` },
        tx,
      );
    await expect(
      createChecklistItem(userId, { phase: "premarket", text: "Overflow" }, tx),
    ).rejects.toThrow("Each phase can have up to 20 steps.");
    await createChecklistItem(userId, { phase: "review", text: "Review" }, tx);
    await createChecklistItem(
      otherUserId,
      { phase: "premarket", text: "Other" },
      tx,
    );
    expect(await listChecklistItems(userId, tx)).toHaveLength(21);
    expect(await listChecklistItems(otherUserId, tx)).toHaveLength(1);
  });
});

it("renames and deletes owned steps, preserves order and allows replacement", async () => {
  await fixture(async (tx, userId) => {
    const first = await createChecklistItem(
      userId,
      { phase: "trading", text: "First" },
      tx,
    );
    const second = await createChecklistItem(
      userId,
      { phase: "trading", text: "Second" },
      tx,
    );
    await renameChecklistItem(userId, first.id, "  Renamed  ", tx);
    expect(
      (await listChecklistItems(userId, tx)).map((item) => item.text),
    ).toEqual(["Renamed", "Second"]);
    await deleteChecklistItem(userId, first.id, tx);
    await createChecklistItem(userId, { phase: "trading", text: "Third" }, tx);
    expect(
      (await listChecklistItems(userId, tx)).map((item) => item.text),
    ).toEqual(["Second", "Third"]);
    expect((await listChecklistItems(userId, tx))[0].id).toBe(second.id);
  });
});

it("keeps another user's steps invisible and rejects their IDs on writes", async () => {
  await fixture(async (tx, userId, otherUserId) => {
    const item = await createChecklistItem(
      otherUserId,
      { phase: "review", text: "Private" },
      tx,
    );
    expect(await listChecklistItems(userId, tx)).toEqual([]);
    await expect(
      renameChecklistItem(userId, item.id, "Changed", tx),
    ).rejects.toThrow("This step no longer exists.");
    await expect(deleteChecklistItem(userId, item.id, tx)).rejects.toThrow(
      "This step no longer exists.",
    );
    expect(
      (await listChecklistItems(otherUserId, tx)).map((item) => item.text),
    ).toEqual(["Private"]);
  });
});

it.each(["", "   ", "x".repeat(121)])(
  "rejects invalid text on add and rename: %j",
  async (text) => {
    await fixture(async (tx, userId) => {
      const item = await createChecklistItem(
        userId,
        { phase: "review", text: "Valid" },
        tx,
      );
      await expect(
        createChecklistItem(userId, { phase: "review", text }, tx),
      ).rejects.toThrow();
      await expect(
        renameChecklistItem(userId, item.id, text, tx),
      ).rejects.toThrow();
      expect(
        (await listChecklistItems(userId, tx)).map((item) => item.text),
      ).toEqual(["Valid"]);
    });
  },
);

it("accepts exactly 120 characters after trimming", async () => {
  await fixture(async (tx, userId) => {
    const item = await createChecklistItem(
      userId,
      { phase: "review", text: ` ${"x".repeat(120)} ` },
      tx,
    );
    await renameChecklistItem(userId, item.id, ` ${"y".repeat(120)} `, tx);
    expect((await listChecklistItems(userId, tx))[0].text).toBe(
      "y".repeat(120),
    );
  });
});

it("deletes a user's template with the user and preserves the other template", async () => {
  await fixture(async (tx, userId, otherUserId) => {
    await createChecklistItem(userId, { phase: "review", text: "Mine" }, tx);
    await createChecklistItem(
      otherUserId,
      { phase: "review", text: "Theirs" },
      tx,
    );
    await tx.delete(users).where(eq(users.id, userId));
    expect(await listChecklistItems(userId, tx)).toEqual([]);
    expect(
      (await listChecklistItems(otherUserId, tx)).map((item) => item.text),
    ).toEqual(["Theirs"]);
  });
});

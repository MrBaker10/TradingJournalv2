import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { users } from "../../schema/users.ts";
import {
  createChecklistItem,
  deleteChecklistItem,
  getDailyChecklist,
  listChecklistChecks,
  listChecklistItems,
  moveChecklistItem,
  renameChecklistItem,
  setChecklistCheck,
} from "../checklist.ts";

const TODAY = "2026-10-26";

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
    await deleteChecklistItem(userId, first.id, TODAY, tx);
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
    await expect(
      deleteChecklistItem(userId, item.id, TODAY, tx),
    ).rejects.toThrow("This step no longer exists.");
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

function checkedTexts(checklist: { text: string; checked: boolean }[]) {
  return checklist.filter((item) => item.checked).map((item) => item.text);
}

describe("daily checklist", () => {
  it("reads today's template unticked and persists tick and untick", async () => {
    await fixture(async (tx, userId) => {
      expect(await getDailyChecklist(userId, TODAY, tx)).toEqual([]);
      const plan = await createChecklistItem(
        userId,
        { phase: "premarket", text: "Mark levels" },
        tx,
      );
      await createChecklistItem(
        userId,
        { phase: "review", text: "Journal" },
        tx,
      );
      expect(await getDailyChecklist(userId, TODAY, tx)).toEqual([
        {
          id: plan.id,
          phase: "premarket",
          text: "Mark levels",
          checked: false,
        },
        expect.objectContaining({ text: "Journal", checked: false }),
      ]);

      await setChecklistCheck(userId, plan.id, TODAY, true, tx);
      await setChecklistCheck(userId, plan.id, TODAY, true, tx);
      expect(checkedTexts(await getDailyChecklist(userId, TODAY, tx))).toEqual([
        "Mark levels",
      ]);

      await setChecklistCheck(userId, plan.id, TODAY, false, tx);
      expect(checkedTexts(await getDailyChecklist(userId, TODAY, tx))).toEqual(
        [],
      );
    });
  });

  it("follows template changes today and keeps earlier days' copied checks", async () => {
    await fixture(async (tx, userId) => {
      const yesterday = "2026-10-25";
      const step = await createChecklistItem(
        userId,
        { phase: "trading", text: "Size down after a loss" },
        tx,
      );
      await setChecklistCheck(userId, step.id, yesterday, true, tx);
      await setChecklistCheck(userId, step.id, TODAY, true, tx);

      const added = await createChecklistItem(
        userId,
        { phase: "trading", text: "Added later" },
        tx,
      );
      expect(await getDailyChecklist(userId, TODAY, tx)).toEqual([
        expect.objectContaining({ id: step.id, checked: true }),
        expect.objectContaining({ id: added.id, checked: false }),
      ]);

      await renameChecklistItem(userId, step.id, "Halve size after a loss", tx);
      expect(checkedTexts(await getDailyChecklist(userId, TODAY, tx))).toEqual([
        "Halve size after a loss",
      ]);

      expect(
        checkedTexts(await getDailyChecklist(userId, "2026-10-27", tx)),
      ).toEqual([]);

      await deleteChecklistItem(userId, step.id, TODAY, tx);
      expect(await getDailyChecklist(userId, TODAY, tx)).toEqual([
        expect.objectContaining({ id: added.id, checked: false }),
      ]);
      expect(await listChecklistChecks(userId, TODAY, tx)).toEqual([]);
      expect(await listChecklistChecks(userId, yesterday, tx)).toEqual([
        { phase: "trading", text: "Size down after a loss" },
      ]);
    });
  });

  it("rejects another user's items on tick and untick and never reads their checks", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const theirs = await createChecklistItem(
        otherUserId,
        { phase: "premarket", text: "Private" },
        tx,
      );
      await setChecklistCheck(otherUserId, theirs.id, TODAY, true, tx);
      for (const checked of [true, false])
        await expect(
          setChecklistCheck(userId, theirs.id, TODAY, checked, tx),
        ).rejects.toThrow("This step no longer exists.");
      expect(await getDailyChecklist(userId, TODAY, tx)).toEqual([]);
      expect(
        checkedTexts(await getDailyChecklist(otherUserId, TODAY, tx)),
      ).toEqual(["Private"]);
    });
  });

  it("deletes a user's checks with the user and keeps the other user's", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      for (const owner of [userId, otherUserId]) {
        const item = await createChecklistItem(
          owner,
          { phase: "review", text: "Review" },
          tx,
        );
        await setChecklistCheck(owner, item.id, TODAY, true, tx);
      }
      await tx.delete(users).where(eq(users.id, userId));
      expect(await listChecklistChecks(userId, TODAY, tx)).toEqual([]);
      expect(await listChecklistChecks(otherUserId, TODAY, tx)).toEqual([
        { phase: "review", text: "Review" },
      ]);
    });
  });
});

describe("reordering", () => {
  it("moves a step within its phase, keeps other phases and today's ticks", async () => {
    await fixture(async (tx, userId) => {
      const texts = async (phase: string) =>
        (await getDailyChecklist(userId, TODAY, tx))
          .filter((item) => item.phase === phase)
          .map((item) => `${item.text}${item.checked ? " ✓" : ""}`);
      const [a, , c] = [
        await createChecklistItem(userId, { phase: "trading", text: "A" }, tx),
        await createChecklistItem(userId, { phase: "trading", text: "B" }, tx),
        await createChecklistItem(userId, { phase: "trading", text: "C" }, tx),
      ];
      await createChecklistItem(userId, { phase: "review", text: "R1" }, tx);
      await createChecklistItem(userId, { phase: "review", text: "R2" }, tx);
      await setChecklistCheck(userId, a.id, TODAY, true, tx);

      await moveChecklistItem(userId, a.id, "down", tx);
      expect(await texts("trading")).toEqual(["B", "A ✓", "C"]);
      await moveChecklistItem(userId, c.id, "up", tx);
      expect(await texts("trading")).toEqual(["B", "C", "A ✓"]);
      expect(await texts("review")).toEqual(["R1", "R2"]);
      expect(
        (await listChecklistItems(userId, tx))
          .filter((item) => item.phase === "trading")
          .map((item) => item.text),
      ).toEqual(["B", "C", "A"]);
    });
  });

  it("keeps the order at the phase edges and across gaps left by deletions", async () => {
    await fixture(async (tx, userId) => {
      const first = await createChecklistItem(
        userId,
        { phase: "premarket", text: "First" },
        tx,
      );
      const gap = await createChecklistItem(
        userId,
        { phase: "premarket", text: "Deleted" },
        tx,
      );
      const last = await createChecklistItem(
        userId,
        { phase: "premarket", text: "Last" },
        tx,
      );
      await deleteChecklistItem(userId, gap.id, TODAY, tx);
      const order = async () =>
        (await listChecklistItems(userId, tx)).map((item) => item.text);

      await moveChecklistItem(userId, first.id, "up", tx);
      await moveChecklistItem(userId, last.id, "down", tx);
      expect(await order()).toEqual(["First", "Last"]);
      await moveChecklistItem(userId, last.id, "up", tx);
      expect(await order()).toEqual(["Last", "First"]);
    });
  });

  it("rejects moving another user's step and leaves their order intact", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await createChecklistItem(
        otherUserId,
        { phase: "review", text: "One" },
        tx,
      );
      const theirs = await createChecklistItem(
        otherUserId,
        { phase: "review", text: "Two" },
        tx,
      );
      await expect(
        moveChecklistItem(userId, theirs.id, "up", tx),
      ).rejects.toThrow("This step no longer exists.");
      expect(
        (await listChecklistItems(otherUserId, tx)).map((item) => item.text),
      ).toEqual(["One", "Two"]);
    });
  });
});

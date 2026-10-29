import { and, eq, isNull, type SQLWrapper, sql } from "drizzle-orm";
import { isDemoUsername } from "../../domain/demo.ts";
import {
  type SetupGuideView,
  setupGuideView,
} from "../../domain/setup-guide.ts";
import {
  SETUP_GUIDE_REFUSED,
  type SetupGuideAnswer,
} from "../../schemas/setup-guide.ts";
import { db } from "../index.ts";
import { accountRules } from "../schema/account-rules.ts";
import { accounts } from "../schema/accounts.ts";
import { checklistTemplateItems } from "../schema/checklist.ts";
import { tradingStrategies } from "../schema/strategies.ts";
import { trades } from "../schema/trades.ts";
import { users } from "../schema/users.ts";

export class SetupGuideError extends Error {}

export type ReadExecutor = Pick<typeof db, "select">;

// Each fact is an uncorrelated EXISTS on a builder subquery, so its own `where`
// qualifies the columns and binds the user id as a parameter
// (coding-standards.md, Database). Archived accounts and strategies are
// retired, so like the account step they tick nothing.
function factColumns(userId: number, executor: ReadExecutor) {
  const exists = (subquery: SQLWrapper) => sql<boolean>`exists ${subquery}`;
  const one = sql`1`;
  const activeAccountOf = and(
    eq(accounts.userId, userId),
    isNull(accounts.archivedAt),
  );
  return {
    hasAccount: exists(
      executor.select({ one }).from(accounts).where(activeAccountOf),
    ),
    hasEntry: exists(
      executor.select({ one }).from(trades).where(eq(trades.userId, userId)),
    ),
    hasLinkedAccount: exists(
      executor
        .select({ one })
        .from(accountRules)
        .innerJoin(accounts, eq(accounts.id, accountRules.accountId))
        .where(activeAccountOf),
    ),
    hasStrategy: exists(
      executor
        .select({ one })
        .from(tradingStrategies)
        .where(
          and(
            eq(tradingStrategies.userId, userId),
            isNull(tradingStrategies.archivedAt),
          ),
        ),
    ),
    hasChecklist: exists(
      executor
        .select({ one })
        .from(checklistTemplateItems)
        .where(eq(checklistTemplateItems.userId, userId)),
    ),
  };
}

/**
 * The setup guide as the dashboard shows it: the stored state plus the facts
 * about the user's data, read in one statement, then the domain rules.
 */
export async function getSetupGuide(
  userId: number,
  executor: ReadExecutor = db,
): Promise<SetupGuideView> {
  const [row] = await executor
    .select({
      state: users.setupGuide,
      username: users.username,
      ...factColumns(userId, executor),
    })
    .from(users)
    .where(eq(users.id, userId));

  // Not a refusal the user could act on, so not a SetupGuideError.
  if (row === undefined) throw new Error("Setup guide: no such user.");
  const { state, username, ...facts } = row;
  return setupGuideView(state, { ...facts, isDemo: isDemoUsername(username) });
}

/**
 * The question card's answer: yes → `active`, no → `declined`. Refused unless
 * the rules show the question right now, which also refuses the demo user and
 * anyone who already answered.
 */
export async function saveSetupGuideAnswer(
  userId: number,
  answer: SetupGuideAnswer,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<void> {
  await executor.transaction(async (tx) => {
    // Locks the user row, so two tabs answering at once cannot both pass.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const view = await getSetupGuide(userId, tx);
    if (view.kind !== "question")
      throw new SetupGuideError(SETUP_GUIDE_REFUSED);
    await tx
      .update(users)
      .set({ setupGuide: answer === "yes" ? "active" : "declined" })
      .where(eq(users.id, userId));
  });
}

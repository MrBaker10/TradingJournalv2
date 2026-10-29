import { StrategyList } from "@/components/strategies/strategy-list";
import { listStrategies, listStrategyTrades } from "@/db/queries/strategies";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// The user's private trading strategies. Not scoped by the account selector:
// a strategy belongs to the user, not to an account.
export default async function StrategiesPage() {
  const user = await getCurrentUser();
  const [strategies, trades] = await Promise.all([
    listStrategies(user.id),
    listStrategyTrades(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <StrategyList
        header={
          <header className="flex flex-col gap-1">
            <h1 className="page-title">Strategies</h1>
            <p className="text-muted-foreground text-xs">
              Your own rules for when and how you trade. Private to you.
            </p>
          </header>
        }
        strategies={strategies}
        trades={trades}
      />
    </div>
  );
}

import { StrategyManager } from "@/components/strategies/strategy-manager";
import { listStrategies } from "@/db/queries/strategies";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// The user's private trading strategies. Not scoped by the account selector:
// a strategy belongs to the user, not to an account.
export default async function StrategiesPage() {
  const user = await getCurrentUser();
  const strategies = await listStrategies(user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Strategies</h1>
      <p className="text-fg-subtle text-xs">
        Your own rules for when and how you trade. Private to you.
      </p>
      <StrategyManager strategies={strategies} />
    </div>
  );
}

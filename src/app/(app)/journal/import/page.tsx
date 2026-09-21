import { ImportWizard } from "@/components/import/import-wizard";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { listImportBatches } from "@/db/queries/import";
import { listInstruments } from "@/db/queries/instruments";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// `dynamic = "force-dynamic"` sits once in the (app) layout and covers this
// segment too — it is not repeated here.

export default async function ImportPage() {
  const user = await getCurrentUser();
  const [accounts, instruments, batches] = await Promise.all([
    listActiveAccountsForSwitcher(user.id),
    listInstruments(),
    listImportBatches(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Import Trades</h1>
      <ImportWizard
        accounts={accounts.map((account) => ({
          id: account.id,
          name: account.name,
          isPractice: account.isPractice,
        }))}
        // `tick_size` is numeric(12,4) and arrives as a string. The browser
        // does the snapping, so it is converted once, here.
        instruments={instruments.map((instrument) => ({
          id: instrument.id,
          symbol: instrument.symbol,
          tickSize: Number(instrument.tickSize),
        }))}
        timeZone={user.timezone}
        batches={batches}
      />
    </div>
  );
}

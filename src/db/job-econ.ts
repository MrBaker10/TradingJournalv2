import { runEconJob } from "../lib/econ/job.ts";

// `pnpm job:econ`: the same handler the Vercel Cron route calls, run by hand.

runEconJob()
  .then((result) => {
    const next =
      result.nextWeek === null
        ? "next week not published yet"
        : `${result.nextWeek} next week`;
    console.log(`job:econ — ${result.thisWeek} events this week, ${next}.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

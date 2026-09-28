import { runMonthCloseJob } from "../lib/month-close/job.ts";

// `pnpm job:month-close`: the same handler the Vercel Cron route calls, run by
// hand.

runMonthCloseJob()
  .then((result) => {
    console.log(
      `job:month-close — ${result.written} month(s) written for ${result.users} user(s).`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

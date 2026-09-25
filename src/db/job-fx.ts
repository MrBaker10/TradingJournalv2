import { runFxJob } from "../lib/fx/job.ts";

// `pnpm job:fx`: the same handler the Vercel Cron route calls, run by hand.

runFxJob()
  .then((result) => {
    console.log(
      `job:fx — ${result.checked} converted trades checked, ${result.corrected} corrected.`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

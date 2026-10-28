import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  decideSource,
  extractText,
  type FetchedSource,
  reportSourceCheck,
  type Source,
  type SourceResult,
  snapshotPath,
} from "../lib/prop-firms/source-check.ts";
import { parseSourceList } from "../lib/prop-firms/sources.ts";

const SOURCE_LIST = "context/prop-firm-sources.md";
const SNAPSHOTS = "context/prop-firm-snapshots";
// Several sources share a help center; one request at a time per host, with a
// pause, so a rate limit does not turn reachable pages into failures.
const PAUSE_MS = 1000;
const TIMEOUT_MS = 30_000;

// The first step of a data refresh (docs/adr/0005): fetch every page on the
// source list, save its text next to the list, and say per firm what changed
// since the last run. It never touches PropFirmsData.md or a database. A
// source that cannot be fetched is reported as failed and keeps its saved
// text, so a dead link never reads as "unchanged".
async function check() {
  const sources: Source[] = parseSourceList(
    await readFile(join(process.cwd(), SOURCE_LIST), "utf8"),
  ).flatMap(({ firm, urls }) => urls.map((url) => ({ firm, url })));

  // Results land at their source's index, so the report keeps the list order
  // even though hosts are fetched side by side.
  const results: SourceResult[] = new Array(sources.length);
  const hosts = Map.groupBy(
    sources.entries(),
    ([, source]) => new URL(source.url).host,
  );
  await Promise.all(
    [...hosts.values()].map(async (queue) => {
      for (const [position, [index, source]] of queue.entries()) {
        if (position > 0) await sleep(PAUSE_MS);
        results[index] = await checkSource(source);
      }
    }),
  );

  for (const line of reportSourceCheck(results)) console.log(line);
  const failed = results.filter((result) => result.outcome === "failed");
  console.log(
    `${results.length} sources, ${failed.length} failed. Saved texts: ${SNAPSHOTS}/ (see git diff).`,
  );
  process.exit(0);
}

async function checkSource(source: Source): Promise<SourceResult> {
  const path = join(process.cwd(), SNAPSHOTS, snapshotPath(source));
  const fetched = await fetchSource(source.url);
  const { save, ...decision } = decideSource(fetched, await readSaved(path));
  if (save && "text" in fetched) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, fetched.text);
  }
  return { ...source, ...decision };
}

async function fetchSource(url: string): Promise<FetchedSource> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "trading-journal-source-check/1.0" },
    });
    if (!response.ok) return { failure: `HTTP ${response.status}` };
    return {
      text: extractText(
        await response.text(),
        response.headers.get("content-type") ?? "",
      ),
    };
  } catch (error) {
    return { failure: failureReason(error) };
  }
}

// Only "no such file" means no saved text yet; any other read error stops the
// run instead of overwriting the file as if it were new.
async function readSaved(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function failureReason(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error.cause as { code?: string } | undefined)?.code;
    return cause ?? error.name;
  }
  return String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});

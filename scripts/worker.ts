import { getEnv } from "../src/lib/env";
import { importFeeds } from "../src/lib/feed-importer";
import { importHotNews } from "../src/lib/hot-news-importer";
import { getRuntimeDatabaseUrl } from "../src/lib/runtime-config";

const intervalMinutes = Number(getEnv("FETCH_INTERVAL_MINUTES", "30"));
const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
const setupCheckMs = 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runOnce() {
  const started = new Date();
  console.log(`[worker] starting hot news import at ${started.toISOString()}`);

  try {
    await importHotNews();

    if (getEnv("ENABLE_RSS_IMPORT", "true") !== "false") {
      await importFeeds();
    }
  } catch (error) {
    console.error("[worker] import failed", error);
  }
}

async function main() {
  while (!getRuntimeDatabaseUrl()) {
    console.log("[worker] database is not configured yet. Waiting for web installer...");
    await sleep(setupCheckMs);
  }

  await runOnce();
  setInterval(runOnce, intervalMs);
  console.log(`[worker] scheduled every ${intervalMinutes} minutes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

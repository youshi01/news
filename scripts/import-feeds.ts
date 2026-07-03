import { importFeeds } from "../src/lib/feed-importer";

importFeeds()
  .then(() => {
    console.log("[feeds] import complete");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

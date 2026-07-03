import { importHotNews } from "../src/lib/hot-news-importer";

importHotNews()
  .then(() => {
    console.log("[hot-news] import complete");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

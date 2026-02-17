import { runAllScrapers } from "./run-all";
import logger from "../config/logger";

const scraperName = process.argv[2];

if (!scraperName) {
  logger.error("Usage: ts-node run-scraper.ts <scraper-name>");
  logger.info(
    "Available scrapers: combi-blocks, chemsworth, ottokemi, chemscene, sigmaaldrich",
  );
  process.exit(1);
}

runAllScrapers([scraperName])
  .then(() => {
    logger.info(`Scraper ${scraperName} completed`);
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Scraper ${scraperName} failed:`, error);
    process.exit(1);
  });

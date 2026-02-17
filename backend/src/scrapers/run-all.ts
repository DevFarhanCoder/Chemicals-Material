import { PrismaClient } from "@prisma/client";
import logger from "../config/logger";
import { ScrapedMaterial } from "./base/BaseScraper";
import { CombiBlocksScraper } from "./combi-blocks.scraper";
import { ChemsworthScraper } from "./chemsworth.scraper";
import { OttoKemiScraper } from "./ottokemi.scraper";
import { ChemSceneScraper } from "./chemscene.scraper";
import { SigmaAldrichScraper } from "./sigmaaldrich.scraper";

const prisma = new PrismaClient();

// Map of scraper instances
const SCRAPERS = {
  "combi-blocks": CombiBlocksScraper,
  chemsworth: ChemsworthScraper,
  ottokemi: OttoKemiScraper,
  chemscene: ChemSceneScraper,
  sigmaaldrich: SigmaAldrichScraper,
};

/**
 * Generate unique case number
 */
function generateCaseNo(sourceSite: string, index: number): string {
  const prefix = sourceSite.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const counter = index.toString().padStart(4, "0");
  return `${prefix}-${timestamp}-${counter}`;
}

/**
 * Save scraped materials to database
 */
async function saveMaterials(
  materials: ScrapedMaterial[],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const [index, material] of materials.entries()) {
    try {
      await prisma.material.create({
        data: {
          caseNo: generateCaseNo(material.sourceSite, index),
          productName: material.productName,
          email: material.email,
          mobile: material.mobile,
          companyName: material.companyName,
          location: material.location,
          price: material.price,
          status: "PENDING",
          sourceUrl: material.sourceUrl,
          sourceSite: material.sourceSite,
          scrapedAt: new Date(),
        },
      });
      success++;
    } catch (error: any) {
      // If duplicate case number, try to upsert
      if (error.code === "P2002") {
        try {
          await prisma.material.update({
            where: { caseNo: generateCaseNo(material.sourceSite, index) },
            data: {
              productName: material.productName,
              price: material.price,
              scrapedAt: new Date(),
            },
          });
          success++;
        } catch (updateError) {
          logger.error("Failed to update material:", updateError);
          failed++;
        }
      } else {
        logger.error("Failed to save material:", error);
        failed++;
      }
    }
  }

  return { success, failed };
}

/**
 * Run a single scraper
 */
async function runSingleScraper(scraperName: string): Promise<void> {
  const ScraperClass = SCRAPERS[scraperName as keyof typeof SCRAPERS];

  if (!ScraperClass) {
    throw new Error(`Unknown scraper: ${scraperName}`);
  }

  const startTime = Date.now();
  let logId: string | null = null;

  try {
    // Create scraping log
    const log = await prisma.scrapingLog.create({
      data: {
        source: scraperName,
        status: "RUNNING",
        startedAt: new Date(),
        itemsScraped: 0,
      },
    });
    logId = log.id;

    logger.info(`Starting scraper: ${scraperName}`);

    // Run scraper
    const scraper = new ScraperClass();
    const materials = await scraper.execute();

    logger.info(`Scraper ${scraperName} found ${materials.length} materials`);

    // Save to database
    const { success, failed } = await saveMaterials(materials);

    const duration = Date.now() - startTime;

    // Update log
    await prisma.scrapingLog.update({
      where: { id: logId },
      data: {
        status: failed > 0 ? "PARTIAL" : "SUCCESS",
        itemsScraped: success,
        itemsFailed: failed,
        completedAt: new Date(),
        duration,
      },
    });

    logger.info(
      `Scraper ${scraperName} completed: ${success} saved, ${failed} failed (${duration}ms)`,
    );
  } catch (error) {
    logger.error(`Scraper ${scraperName} failed:`, error);

    // Update log with error
    if (logId) {
      await prisma.scrapingLog.update({
        where: { id: logId },
        data: {
          status: "FAILED",
          errors: { message: (error as Error).message },
          completedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });
    }

    throw error;
  }
}

/**
 * Run all scrapers or specified ones
 */
export async function runAllScrapers(sourceNames?: string[]): Promise<void> {
  const sources = sourceNames || Object.keys(SCRAPERS);

  logger.info(`Running scrapers: ${sources.join(", ")}`);

  const concurrency = parseInt(process.env.SCRAPING_CONCURRENCY || "2");

  // Run scrapers with limited concurrency
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);

    await Promise.allSettled(batch.map((source) => runSingleScraper(source)));

    // Wait between batches
    if (i + concurrency < sources.length) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info("All scrapers completed");
  await prisma.$disconnect();
}

// If run directly
if (require.main === module) {
  runAllScrapers()
    .then(() => {
      logger.info("Scraping completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Scraping failed:", error);
      process.exit(1);
    });
}

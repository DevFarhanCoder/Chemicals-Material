import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import logger from "../config/logger";
import { runAllScrapers } from "../scrapers/run-all";

/**
 * POST /api/scraping/trigger
 * Trigger scraping for one or all sources
 */
export const triggerScraping = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sources } = req.body; // Optional array of source names

    logger.info("Scraping triggered", { sources: sources || "all" });

    // Start scraping in background (don't wait)
    runAllScrapers(sources).catch((error) => {
      logger.error("Scraping failed:", error);
    });

    res.json({
      message: "Scraping started",
      sources: sources || "all",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/scraping/logs
 * Get scraping logs
 */
export const getScrapingLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const source = req.query.source as string;

    const where: any = {};
    if (source) {
      where.source = source;
    }

    const logs = await prisma.scrapingLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    res.json(logs);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/scraping/status
 * Get current scraping status
 */
export const getScrapingStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the most recent log for each source
    const recentLogs = await prisma.scrapingLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    // Check if any scraping is currently running
    const runningScrapes = recentLogs.filter(
      (log: any) => log.status === "RUNNING",
    );

    res.json({
      isRunning: runningScrapes.length > 0,
      activeSources: runningScrapes.map((log: any) => log.source),
      recentLogs: recentLogs.slice(0, 5),
    });
  } catch (error) {
    return next(error);
  }
};

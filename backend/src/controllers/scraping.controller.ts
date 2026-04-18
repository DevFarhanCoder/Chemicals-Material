import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export const triggerScraping = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const { sources } = req.body;
  logger.info("Scraping triggered (disabled)", { sources: sources || "all" });
  res.json({ message: "Scraping is disabled", sources: sources || "all" });
};

export const getScrapingLogs = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  res.json([]);
};

export const getScrapingStatus = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  res.json({ isRunning: false, activeSources: [], recentLogs: [] });
};

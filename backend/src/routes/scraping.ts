import { Router } from "express";
import {
  triggerScraping,
  getScrapingLogs,
  getScrapingStatus,
} from "../controllers/scraping.controller";

const router = Router();

/**
 * @route   POST /api/scraping/trigger
 * @desc    Trigger scraping for specified sources
 * @body    { sources?: string[] }
 */
router.post("/trigger", triggerScraping);

/**
 * @route   GET /api/scraping/logs
 * @desc    Get scraping logs
 * @query   limit, source
 */
router.get("/logs", getScrapingLogs);

/**
 * @route   GET /api/scraping/status
 * @desc    Get current scraping status
 */
router.get("/status", getScrapingStatus);

export default router;

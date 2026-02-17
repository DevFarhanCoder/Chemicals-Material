import puppeteer, { Browser, Page } from "puppeteer";
import logger from "../../config/logger";

export interface ScrapedMaterial {
  productName: string;
  email?: string;
  mobile?: string;
  companyName: string;
  location?: string;
  price?: string;
  sourceUrl: string;
  sourceSite: string;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected sourceName: string;
  protected maxRetries: number;
  protected rateLimit: number; // milliseconds between requests

  constructor(sourceName: string) {
    this.sourceName = sourceName;
    this.maxRetries = parseInt(process.env.SCRAPING_MAX_RETRIES || "3");
    this.rateLimit = parseInt(process.env.SCRAPING_RATE_LIMIT_MS || "2000");
  }

  /**
   * Initialize browser and page
   */
  protected async init(): Promise<void> {
    try {
      logger.info(`Initializing scraper for ${this.sourceName}`);

      this.browser = await puppeteer.launch({
        headless: process.env.HEADLESS_BROWSER !== "false",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });

      this.page = await this.browser.newPage();

      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      // Block unnecessary resources to speed up
      await this.page.setRequestInterception(true);
      this.page.on("request", (request) => {
        const resourceType = request.resourceType();
        if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info(`Scraper initialized for ${this.sourceName}`);
    } catch (error) {
      logger.error(
        `Failed to initialize scraper for ${this.sourceName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.info(`Scraper cleanup completed for ${this.sourceName}`);
    } catch (error) {
      logger.error(`Cleanup failed for ${this.sourceName}:`, error);
    }
  }

  /**
   * Wait with rate limiting
   */
  protected async wait(ms?: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms || this.rateLimit));
  }

  /**
   * Retry logic for operations
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        logger.warn(`Retry ${i + 1}/${retries} failed:`, error);
        if (i === retries - 1) throw error;
        await this.wait(2000 * (i + 1)); // Exponential backoff
      }
    }
    throw new Error("All retries failed");
  }

  /**
   * Extract email from text
   */
  protected extractEmail(text: string): string | undefined {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const match = text.match(emailRegex);
    return match ? match[0] : undefined;
  }

  /**
   * Extract phone number from text
   */
  protected extractPhone(text: string): string | undefined {
    // Match various phone formats (at least 10 consecutive digits, may include formatting)
    const phoneRegex =
      /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const match = text.match(phoneRegex);

    if (match && match[0]) {
      // Clean up phone number: remove extra spaces and formatting
      return match[0].replace(/\s+/g, " ").trim();
    }

    return undefined;
  }

  /**
   * Clean text - remove extra whitespace, HTML entities, etc.
   */
  protected cleanText(text: string): string {
    return text
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Take screenshot for debugging
   */
  protected async takeScreenshot(name: string): Promise<void> {
    if (this.page && process.env.NODE_ENV === "development") {
      try {
        await this.page.screenshot({
          path: `logs/screenshots/${this.sourceName}-${name}-${Date.now()}.png`,
          fullPage: true,
        });
      } catch (error) {
        logger.warn("Failed to take screenshot:", error);
      }
    }
  }

  /**
   * Main scraping method - to be implemented by child classes
   */
  abstract scrape(): Promise<ScrapedMaterial[]>;

  /**
   * Execute the full scraping workflow
   */
  async execute(): Promise<ScrapedMaterial[]> {
    try {
      await this.init();
      const materials = await this.scrape();
      await this.cleanup();
      return materials;
    } catch (error) {
      logger.error(`Scraping failed for ${this.sourceName}:`, error);
      await this.cleanup();
      throw error;
    }
  }
}

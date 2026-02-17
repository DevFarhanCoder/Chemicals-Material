import { BaseScraper, ScrapedMaterial } from "./base/BaseScraper";
import logger from "../config/logger";

/**
 * Scraper for Sigma-Aldrich
 * https://www.sigmaaldrich.com/IN/en/products/analytical-chemistry#products
 *
 * Note: This site is heavily JavaScript-based and may require more sophisticated scraping
 */
export class SigmaAldrichScraper extends BaseScraper {
  private readonly startUrl =
    "https://www.sigmaaldrich.com/IN/en/products/analytical-chemistry#products";

  constructor() {
    super("sigmaaldrich");
  }

  async scrape(): Promise<ScrapedMaterial[]> {
    const materials: ScrapedMaterial[] = [];

    try {
      if (!this.page) throw new Error("Page not initialized");

      logger.info(`Navigating to ${this.startUrl}`);
      await this.page.goto(this.startUrl, {
        waitUntil: "networkidle2",
        timeout: 60000, // Longer timeout for heavy JS site
      });

      // Wait for products to load (may need adjustment)
      await this.wait(5000);

      const contactInfo = await this.extractContactInfo();

      // Try to extract product listings
      // This site structure may be complex, so using multiple strategies
      const products = await this.page.evaluate(() => {
        const items: Array<{ name: string; price: string; url: string }> = [];

        // Strategy 1: Look for product cards/items
        // @ts-expect-error - document is available in Puppeteer browser context
        const productCards = document.querySelectorAll(
          '[data-testid*="product"], .product-card, .product-item, [class*="Product"]',
        );

        productCards.forEach((card: any) => {
          const nameEl = card.querySelector(
            '[class*="name"], [class*="title"], h3, h4',
          );
          const priceEl = card.querySelector(
            '[class*="price"], [class*="cost"]',
          );

          if (nameEl && nameEl.textContent) {
            items.push({
              name: nameEl.textContent.trim(),
              price: priceEl?.textContent?.trim() || "",
              // @ts-expect-error - window is available in Puppeteer browser context
              url: window.location.href,
            });
          }
        });

        // Strategy 2: Table rows
        if (items.length === 0) {
          // @ts-expect-error - document is available in Puppeteer browser context
          const rows = document.querySelectorAll("tr[data-testid], tbody tr");
          rows.forEach((row: any) => {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 2) {
              items.push({
                name: cells[0].textContent?.trim() || "",
                price: cells[cells.length - 1].textContent?.trim() || "",
                // @ts-expect-error - window is available in Puppeteer browser context
                url: window.location.href,
              });
            }
          });
        }

        return items.filter((item) => item.name.length > 0);
      });

      logger.info(`Found ${products.length} products on Sigma-Aldrich`);

      for (const product of products.slice(0, 50)) {
        materials.push({
          productName: this.cleanText(product.name),
          price: product.price || undefined,
          companyName: contactInfo.companyName,
          email: contactInfo.email,
          mobile: contactInfo.phone,
          location: contactInfo.location,
          sourceUrl: product.url,
          sourceSite: this.sourceName,
        });
      }

      logger.info(`Scraped ${materials.length} materials from Sigma-Aldrich`);
    } catch (error) {
      logger.error("Error scraping Sigma-Aldrich:", error);
      await this.takeScreenshot("error");
    }

    return materials;
  }

  private async extractContactInfo(): Promise<{
    companyName: string;
    email?: string;
    phone?: string;
    location?: string;
  }> {
    if (!this.page) throw new Error("Page not initialized");

    try {
      // @ts-expect-error - document is available in Puppeteer browser context
      const pageText = await this.page.evaluate(() => document.body.innerText);

      return {
        companyName: "Sigma-Aldrich (Merck)",
        email: this.extractEmail(pageText),
        phone: this.extractPhone(pageText),
        location: "St. Louis, MO, USA",
      };
    } catch (error) {
      return {
        companyName: "Sigma-Aldrich (Merck)",
        location: "USA",
      };
    }
  }
}

import { BaseScraper, ScrapedMaterial } from "./base/BaseScraper";
import logger from "../config/logger";

/**
 * Scraper for ChemScene
 * https://www.chemscene.com/products/elements-and-their-salts/lithium-salt.html
 */
export class ChemSceneScraper extends BaseScraper {
  private readonly startUrl =
    "https://www.chemscene.com/products/elements-and-their-salts/lithium-salt.html";

  constructor() {
    super("chemscene");
  }

  async scrape(): Promise<ScrapedMaterial[]> {
    const materials: ScrapedMaterial[] = [];

    try {
      if (!this.page) throw new Error("Page not initialized");

      logger.info(`Navigating to ${this.startUrl}`);
      await this.page.goto(this.startUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await this.wait(3000);

      const contactInfo = await this.extractContactInfo();

      // Extract product listings
      const products = await this.page.evaluate(() => {
        const items: Array<{ name: string; price: string; url: string }> = [];

        // Multiple possible selectors for products
        const selectors = [
          ".product-item",
          ".product",
          "tr[data-product]",
          ".chemical-list-item",
        ];

        for (const selector of selectors) {
          // @ts-expect-error - document is available in Puppeteer browser context
          const elements = document.querySelectorAll(selector);

          elements.forEach((el: any) => {
            const nameEl = el.querySelector(
              ".name, .product-name, td:first-child, h3",
            );
            const priceEl = el.querySelector(".price, .cost");

            if (nameEl && nameEl.textContent) {
              items.push({
                name: nameEl.textContent.trim(),
                price: priceEl?.textContent?.trim() || "",
                // @ts-expect-error - window is available in Puppeteer browser context
                url: window.location.href,
              });
            }
          });

          if (items.length > 0) break;
        }

        return items;
      });

      logger.info(`Found ${products.length} products on ChemScene`);

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

      logger.info(`Scraped ${materials.length} materials from ChemScene`);
    } catch (error) {
      logger.error("Error scraping ChemScene:", error);
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
        companyName: "ChemScene",
        email: this.extractEmail(pageText),
        phone: this.extractPhone(pageText),
        location: "Monmouth Junction, NJ, USA",
      };
    } catch (error) {
      return {
        companyName: "ChemScene",
        location: "USA",
      };
    }
  }
}

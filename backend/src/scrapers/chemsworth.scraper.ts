import { BaseScraper, ScrapedMaterial } from "./base/BaseScraper";
import logger from "../config/logger";

/**
 * Scraper for Chemsworth
 * https://www.chemsworth.com/Home/Index
 */
export class ChemsworthScraper extends BaseScraper {
  private readonly startUrl = "https://www.chemsworth.com/Home/Index";

  constructor() {
    super("chemsworth");
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

      // Extract company info
      const contactInfo = await this.extractContactInfo();

      // Look for product links or catalog
      const products = await this.page.evaluate(() => {
        const items: Array<{ name: string; price: string; url: string }> = [];

        // Adjust selectors based on actual page structure
        // @ts-expect-error - document is available in Puppeteer browser context
        const productLinks = document.querySelectorAll(
          'a[href*="product"], .product-link',
        );

        productLinks.forEach((link: any) => {
          if (link.textContent) {
            items.push({
              name: link.textContent.trim(),
              price: "",
              // @ts-expect-error - window and HTMLAnchorElement available in browser context
              url: (link as HTMLAnchorElement).href || window.location.href,
            });
          }
        });

        // If no products found, try alternative selectors
        if (items.length === 0) {
          // @ts-expect-error - document is available in Puppeteer browser context
          const divs = document.querySelectorAll(".product, .item, .chemical");
          divs.forEach((div: any) => {
            if (div.textContent) {
              items.push({
                name: div.textContent.trim().substring(0, 100),
                price: "",
                // @ts-expect-error - window is available in Puppeteer browser context
                url: window.location.href,
              });
            }
          });
        }

        return items;
      });

      logger.info(`Found ${products.length} products on Chemsworth`);

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

      logger.info(`Scraped ${materials.length} materials from Chemsworth`);
    } catch (error) {
      logger.error("Error scraping Chemsworth:", error);
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
        companyName: "Chemsworth",
        email: this.extractEmail(pageText),
        phone: this.extractPhone(pageText),
        location: "India",
      };
    } catch (error) {
      return {
        companyName: "Chemsworth",
        location: "India",
      };
    }
  }
}

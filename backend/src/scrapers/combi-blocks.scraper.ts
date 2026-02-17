import { BaseScraper, ScrapedMaterial } from "./base/BaseScraper";
import logger from "../config/logger";

/**
 * Scraper for Combi-Blocks
 * https://www.combi-blocks.com/blocks/SU1.htm
 */
export class CombiBlocksScraper extends BaseScraper {
  private readonly startUrl = "https://www.combi-blocks.com/blocks/SU1.htm";

  constructor() {
    super("combi-blocks");
  }

  async scrape(): Promise<ScrapedMaterial[]> {
    const materials: ScrapedMaterial[] = [];

    try {
      if (!this.page) throw new Error("Page not initialized");

      logger.info(`Navigating to ${this.startUrl}`);
      await this.page.goto(this.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await this.wait(2000); // Wait for content to load

      // Extract company contact information from page
      const contactInfo = await this.extractContactInfo();

      // Extract product listings
      const products = await this.page.evaluate(() => {
        const items: Array<{
          name: string;
          cas: string;
          price: string;
          url: string;
        }> = [];

        // Look for table rows or product listings
        // Adjust selectors based on actual page structure
        // @ts-expect-error - document is available in Puppeteer browser context
        const rows = document.querySelectorAll("tr, .product-item");

        rows.forEach((row: any) => {
          const nameEl = row.querySelector("td:first-child, .product-name");
          const casEl = row.querySelector("td:nth-child(2), .cas");
          const priceEl = row.querySelector("td:nth-child(3), .price");

          if (nameEl && nameEl.textContent) {
            items.push({
              name: nameEl.textContent.trim(),
              cas: casEl?.textContent?.trim() || "",
              price: priceEl?.textContent?.trim() || "",
              // @ts-expect-error - window is available in Puppeteer browser context
              url: window.location.href,
            });
          }
        });

        return items;
      });

      logger.info(`Found ${products.length} products on Combi-Blocks`);

      // Convert to ScrapedMaterial format
      for (const product of products.slice(0, 50)) {
        // Limit to 50 for demo
        // Extract CAS number if available
        const casNumber =
          this.extractCASNumber(product.cas + " " + product.name) ||
          this.generateCaseNumber();

        materials.push({
          caseNo: casNumber,
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

      logger.info(`Scraped ${materials.length} materials from Combi-Blocks`);
    } catch (error) {
      logger.error("Error scraping Combi-Blocks:", error);
      await this.takeScreenshot("error");
    }

    return materials;
  }

  /**
   * Extract contact information from the page or contact page
   */
  private async extractContactInfo(): Promise<{
    companyName: string;
    email?: string;
    phone?: string;
    location?: string;
  }> {
    if (!this.page) throw new Error("Page not initialized");

    try {
      // Try to navigate to contact page or extract from footer
      const contactPageUrl = "https://www.combi-blocks.com/contact.htm";
      
      try {
        await this.page.goto(contactPageUrl, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await this.wait(1000);
      } catch (error) {
        logger.warn("Could not load contact page, using main page");
      }

      // Extract contact information from specific sections
      const contactData = await this.page.evaluate(() => {
        // Look for contact section, footer, or specific contact elements
        const contactSection =
          document.querySelector(".contact, #contact, footer") ||
          document.body;
        const text = contactSection.textContent || "";

        // Extract location from text
        let location = "USA";
        const locationMatch = text.match(
          /(San Diego|California|CA|USA|United States)/i,
        );
        if (locationMatch) {
          location = locationMatch[0];
        }

        return {
          pageText: text,
          location,
        };
      });

      // Navigate back to products page
      await this.page.goto(this.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      return {
        companyName: "Combi-Blocks",
        email: this.extractEmail(contactData.pageText),
        phone: this.extractPhone(contactData.pageText),
        location: contactData.location || "San Diego, CA, USA",
      };
    } catch (error) {
      logger.warn("Could not extract contact info:", error);
      return {
        companyName: "Combi-Blocks",
        location: "USA",
      };
    }
  }
}

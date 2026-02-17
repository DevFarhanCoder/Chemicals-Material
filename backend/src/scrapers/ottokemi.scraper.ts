import { BaseScraper, ScrapedMaterial } from "./base/BaseScraper";
import logger from "../config/logger";

/**
 * Scraper for OttoKemi
 * https://www.ottokemi.com/research-laboratory-chemicals/affinity-chromatography.aspx
 */
export class OttoKemiScraper extends BaseScraper {
  private readonly startUrl =
    "https://www.ottokemi.com/research-laboratory-chemicals/affinity-chromatography.aspx";

  constructor() {
    super("ottokemi");
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

      await this.wait(2000);

      const contactInfo = await this.extractContactInfo();

      // Extract product listings from the page
      const products = await this.page.evaluate(() => {
        const items: Array<{
          name: string;
          cas: string;
          price: string;
          url: string;
        }> = [];

        // Look for product listings
        // @ts-expect-error - document is available in Puppeteer browser context
        const productElements = document.querySelectorAll(
          ".product-item, .chemical-item, tr, .list-item",
        );

        productElements.forEach((el: any) => {
          const nameEl = el.querySelector("td, .name, h3, .title");
          const casEl = el.querySelector(".cas, .cas-number");
          const priceEl = el.querySelector(".price, .cost");

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

      logger.info(`Found ${products.length} products on OttoKemi`);

      for (const product of products.slice(0, 50)) {
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

      logger.info(`Scraped ${materials.length} materials from OttoKemi`);
    } catch (error) {
      logger.error("Error scraping OttoKemi:", error);
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
      // Try to get contact info from footer or contact section
      const contactData = await this.page.evaluate(() => {
        // @ts-expect-error - document is available in Puppeteer browser context
        const contactSection =
          document.querySelector(".contact, #contact, footer, .footer") ||
          document.body;
        const text = contactSection.textContent || "";

        // Look for location
        let location = "India";
        const locationMatch = text.match(/(Mumbai|India|Maharashtra)/i);
        if (locationMatch) {
          location = locationMatch[0];
        }

        return {
          pageText: text,
          location,
        };
      });

      return {
        companyName: "OttoKemi",
        email: this.extractEmail(contactData.pageText),
        phone: this.extractPhone(contactData.pageText),
        location: contactData.location || "Mumbai, India",
      };
    } catch (error) {
      return {
        companyName: "OttoKemi",
        location: "India",
      };
    }
  }
}

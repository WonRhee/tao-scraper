import puppeteer from "puppeteer";
import { ScrapingBrowser, ProxyCountry } from "@zenrows/browser-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();
const PQueue = (await import("p-queue")).default;

/**
 * Creates and returns a new Puppeteer page instance.
 * This function establishes a connection to a browser instance using the ScrapingBrowser API,
 * launches a new browser with specified options, and returns a new page.
 *
 * @returns {Promise<{browser: puppeteer.Browser, page: puppeteer.Page}>} - A promise that resolves to an object containing the browser and a new Puppeteer page instance.
 */
export const getNewPage = async () => {
  const connectionURL = new ScrapingBrowser({
    apiKey: process.env.ZENROWS_API_KEY,
  }).getConnectURL({
    proxy: { location: ProxyCountry.US },
  });

  const browser = await puppeteer.launch({
    browserWSEndpoint: connectionURL,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
  );

  return { browser, page };
};

/**
 * Scrape MLS source from a Trulia listing.
 * This function uses the ZenRows API to fetch the HTML content of a Trulia listing page,
 * parses the HTML with Cheerio, and extracts the MLS source information.
 *
 * @param {string} truliaListingUrl - The URL of the Trulia listing to scrape.
 * @returns {Promise<string>} - A promise that resolves to the MLS source information.
 */
export const scrapeTruliaListingMls = async (truliaListingUrl) => {
  console.log("Scraping MLS source for:", truliaListingUrl);

  const apikey = process.env.ZENROWS_API_KEY;

  try {
    const response = await axios({
      url: "https://api.zenrows.com/v1/",
      method: "GET",
      params: {
        url: truliaListingUrl,
        apikey: apikey,
        premium_proxy: "true",
        proxy_country: "us",
      },
    });

    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);
    const mlsSource = $(
      "span[data-testid='hdp-attribution-block-mls-source']"
    ).text();

    return mlsSource;
  } catch (error) {
    console.error(
      `Failed to scrape MLS source for ${truliaListingUrl}:`,
      error
    );
    throw error;
  }
};

/**
 * Scrape Trulia website for home listings.
 * This function navigates to the Trulia website for a specified state and city, scrolls through the page to load all listings,
 * and extracts relevant information such as price, beds, baths, square footage, address, and link.
 *
 * @param {string} state - The state to search for listings.
 * @param {string} city - The city to search for listings.
 * @returns {Promise<Array<any>>} - A promise that resolves to an array of listing objects.
 */
export const scrapeTruliaResults = async (state, city) => {
  const { browser, page } = await getNewPage();

  // Search by state and city
  await page.goto(`https://www.trulia.com/${state}/${city}`, {
    waitUntil: "networkidle0",
  });

  // Scroll down a few times to load all listings
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      let scrollCount = 0;
      const maxScrolls = 5; // Number of scrolls

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount += 1;

        if (scrollCount >= maxScrolls || totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });

  // After scrolling, ensure dynamic requests are done
  await page.waitForNetworkIdle();

  // Extract listings from result page
  const listings = await page.$$eval(
    "ul li[data-testid^='srp-home-card-']",
    (listings) => {
      return listings.map((el) => {
        const price = el.querySelector(
          '[data-testid="property-price"]'
        )?.textContent;
        const beds = el.querySelector(
          '[data-testid="property-beds"]'
        )?.textContent;
        const baths = el.querySelector(
          '[data-testid="property-baths"]'
        )?.textContent;
        const sf = el.querySelector(
          '[data-testid="property-floorSpace"]'
        )?.textContent;
        const address = el.querySelector(
          '[data-testid="property-address"]'
        )?.textContent;
        const link = el.querySelector(
          '[data-testid="property-card-link"]'
        )?.href;
        if (price) {
          return { price, beds, baths, sf, address, link };
        }
      });
    }
  );

  // Filter out bad listings
  let cleanListings = listings.filter((l) => l !== null);
  console.log(cleanListings);

  // TODO: Handle if no listings are found
  // Go to each listing page and get the MLS source
  for (const listing of cleanListings) {
    const mlsSource = await scrapeTruliaListingMls(listing.link);
    listing.mlsSource = mlsSource;
  }

  await browser.close();
  return cleanListings;
};

/**
 * Process a listing to scrape additional information.
 *
 * @param {any} listing - The listing object to process.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 */
const processListing = async (listing) => {
  const url = listing.link;
  const apikey = "057485e18425b59b50a08f7d399e91856be7158c";

  try {
    const response = await axios({
      url: "https://api.zenrows.com/v1/",
      method: "GET",
      params: {
        url: url,
        apikey: apikey,
        js_render: "true",
        premium_proxy: "true",
        proxy_country: "us",
      },
    });

    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);
    const mlsSource = $(
      "span[data-testid='hdp-attribution-block-mls-source']"
    ).text();
    listing.source = mlsSource;
  } catch (error) {
    console.error(`Failed to process listing ${listing.link}:`, error);
  }
};

/**
 * Scrape all listings concurrently with a limit on the number of concurrent tasks.
 *
 * @param {Array<any>} cleanListings - The array of listings to process.
 * @returns {Promise<void>} - A promise that resolves when all listings have been processed.
 */
export const scrapeAllListings = async (cleanListings) => {
  const queue = new PQueue({ concurrency: 5 }); // Set concurrency limit

  for (const listing of cleanListings) {
    queue.add(() => processListing(listing));
  }

  await queue.onIdle(); // Wait for all tasks to complete
  console.log("All listings processed");
};

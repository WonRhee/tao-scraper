import dotenv from "dotenv";
dotenv.config();

/**
 * Safely scrapes the HTML content of a given URL using a remote browser service.
 *
 * @param {string} targetUrl - The URL of the page to scrape.
 * @returns {Promise<string>} - A promise that resolves to the HTML content of the page.
 *
 * @example
 * const htmlContent = await safeScrape('https://example.com');
 * console.log(htmlContent);
 */
const SafeScrape = async (targetUrl) => {
  const endpoint = "https://production-sfo.browserless.io/chromium/bql";
  const token = process.env.BROWSERLESS_TOKEN;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `mutation Scrape ($url: String!) {
        goto(
          url: $url,
          waitUntil: networkIdle
        ) {
          status
          time
        }
        html {
          html
        }
        screenshot{
          base64
        }
      }`,
      variables: { url: targetUrl },
      operationName: "Scrape",
    }),
  };
  const url = `${endpoint}?token=${token}`;
  const response = await fetch(url, options);
  const json = await response.json();
  // Extract HTML content
  return json.data.html.html;
};

export default SafeScrape;

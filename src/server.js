import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import SafeScrape from "../src/utils/safe-scrape.js";
import { scrapeTruliaResults } from "../src/utils/trulia-scape.js";
import * as cheerio from "cheerio";
dotenv.config();

// Helper function to get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 443;

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Define a route
app.get("/", (req, res) => {
  res.render("index");
});

// Define a route to handle form submission
app.post("/search-trulia", async (req, res) => {
  const { city, state } = req.body;
  const data = await scrapeTruliaResults(state, city);
  res.render("search-trulia", { data });
});

app.post("/search-google", async (req, res) => {
  const { question } = req.body;
  const html = await SafeScrape(`https://www.google.com/search?q=${question}`);

  // Parse HTML with Cheerio
  const $ = cheerio.load(html);

  // Extract only organic search results, avoiding ads
  const sites = [];
  $('div[class^="g "] div:first-child div:first-child div a').each((i, el) => {
    sites.push({
      title: $(el).text(),
      url: $(el).attr("href"),
    });
  });
  console.log(sites);
  res.render("search-google", { sites });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

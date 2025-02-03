# Tao Digital Solution Web Scraping Exercise

This repository contains my code for a web scraping exercise, part of the interview process for the remote Web Scraping Engineer position at Tao Digital Solutions. The primary objective of this exercise is to demonstrate my web scraping skills and knowledge. I’ve had to improvise due to some ambiguities in the exercise instructions. Please don’t hesitate to ask any questions about my decisions and implementations.

The service is built primarily using Node.js, Express, and Puppeteer. The application and its API endpoint are deployed and hosted on Heroku.

One of the most challenging aspects of this task was circumventing captchas and anti-scraping mechanisms. To minimize detection, I utilized a third-party proxy service providers, Browserless.io and Zendrows.

Please note that the code is minimal and does not adhere to many of the best practices that I would typically follow in a production environment. Here’s the basic flow when the `/scrape-trulia` endpoint receives a POST request:

1. Parse Request Body: The server parses the city and state parameters from the request body.
2. Invoke Scraping Function: The scrapeTruliaResults function is called with the parsed state and city parameters.
3. Launch Puppeteer: Inside scrapeTruliaResults, a new Puppeteer browser instance is launched using the getNewPage function.
4. Navigate to Trulia: Puppeteer navigates to the Trulia website for the specified state and city.
5. Scroll to Load Listings: The page is scrolled multiple times to ensure all listings are loaded.
6. Extract Listings: The listings are extracted from the page using Puppeteer's $$eval method.
7. Scrape MLS Source: For each listing, the scrapeTruliaListingMls function is called to scrape the MLS source information.
8. Render Results: The results are rendered using the search-trulia.ejs template and sent back as the response.

## Authors

- [@wonrhee3](https://www.github.com/wonrhee3) Won J. Rhee

## App URL

- https://tao-scraper-307b2e99c916.herokuapp.com/

## API Reference

Postman or simply using browser to the above endpoint should work. It may take up to a minute to respond.

Example JSON response:

```
{
    "source": "trulia.com",
    "results": [
        {
            "price": "$949,000",
            "beds": "3bd",
            "baths": "2ba",
            "address": "2844 W  Rowland Cir, \nAnaheim, CA 92804",
            "link": "https://trulia.com/home/2844-w-rowland-cir-anaheim-ca-92804-25217009"
        },
        {
            "price": "$1,299,000",
            "beds": "5bd",
            "baths": "3ba",
            "address": "9861 Theresa Ave, \nAnaheim, CA 92804",
            "link": "https://trulia.com/home/9861-theresa-ave-anaheim-ca-92804-25219665"
        },
        {
            "price": "$1,189,900",
            "beds": "4bd",
            "baths": "2ba",
            "address": "7880 E  Samantha Cir, \nAnaheim, CA 92807",
            "link": "https://trulia.com/home/7880-e-samantha-cir-anaheim-ca-92807-25398651"
        }
    ]
}
```

### Get Google Search Results

```http
  POST /search-google
```

**Body Payload**
| Field | Type | Description |
| -------- | ------- | ----------|
| `question` | `string` | **Required**. The search query.

### Search Trulia

```http
  POST /search-trulia
```

**Body Payload**
| Field | Type | Description |
| -------- | ------- | ----------|
| `city` | `string` | **Required**. Provide city name to search.
| `state` | `string` | **Required**. Provide state name to search (e.g. CA, NY, TX).

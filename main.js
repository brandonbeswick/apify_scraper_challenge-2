/*

=======================
For this I went to https://sdk.apify.com/docs/examples/puppeteercrawler
and used their example. From there I was able to use the enqeueLinks function
to move through the pages. I only set it to 3 so it wouldnt take forever to run
=======================

*/

const Apify = require('apify');
const util = require('util');


Apify.main(async () => {
    // Create and initialize an instance of the RequestList class that contains the start URL.
    const requestList = new Apify.RequestList({
        sources: [
            { url: 'https://www.visithoustontexas.com/events/' },
        ],
    });
    await requestList.initialize();

    // Apify.openRequestQueue() is a factory to get a preconfigured RequestQueue instance.
    const requestQueue = await Apify.openRequestQueue();

    // Create an instance of the PuppeteerCrawler class - a crawler
    // that automatically loads the URLs in headless Chrome / Puppeteer.
    const crawler = new Apify.PuppeteerCrawler({
        // The crawler will first fetch start URLs from the RequestList
        // and then the newly discovered URLs from the RequestQueue
        requestList,
        requestQueue,

        // Here you can set options that are passed to the Apify.launchPuppeteer() function.
        // For example, you can set "slowMo" to slow down Puppeteer operations to simplify debugging
        launchPuppeteerOptions: { slowMo: 500 },

        // Stop crawling after several pages
        //I set this to 3 so it would not take up a lot of time on my comp
        maxRequestsPerCrawl: 3,

        // This function will be called for each URL to crawl.
        // Here you can write the Puppeteer scripts you are familiar with,
        // with the exception that browsers and pages are automatically managed by the Apify SDK.
        // The function accepts a single parameter, which is an object with the following fields:
        // - request: an instance of the Request class with information such as URL and HTTP method
        // - page: Puppeteer's Page object (see https://pptr.dev/#show=api-class-page)
        handlePageFunction: async ({ request, page }) => {
            console.log(`Processing ${request.url}...`);

            // A function to be evaluated by Puppeteer within the browser context.
            const pageFunction = ($posts) => {
                const data = [];

                // We're gretting the Title and link for events
                $posts.forEach(($post) => {
                    data.push({
                        title: $post.querySelector('.title a').innerText,
                        href: $post.querySelector('.title a').href,
                    });
                });

                return data;
            };
            const data = await page.$$eval('.eventItem', pageFunction);
            console.log(data);
            // Store the results to the default dataset.
            await Apify.pushData(data);

            // Find a link to the next page and enqueue it if it exists.
            const infos = await Apify.utils.enqueueLinks({
                page,
                requestQueue,
                selector: '.next',
            });

            if (infos.length === 0) console.log(`${request.url} is the last page!`);
        },

        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times`);
        },
    });

    // Run the crawler and wait for it to finish.
    await crawler.run();

    console.log('Crawler finished.');
});

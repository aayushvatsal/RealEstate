const puppeteer = require('puppeteer');

class Scraper {
    static async scrapeProperty(url) {
        const browser = await puppeteer.launch({
            headless: true,  // Set to true for production
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });

        try {
            const page = await browser.newPage();
            
            // Set realistic user agent and headers
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1'
            });

            // Enable JavaScript and block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const resourceType = request.resourceType();
                if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            console.log('Navigating to URL:', url);
            
            // Navigate with longer timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Wait for property cards to load
            await page.waitForSelector('.mb-srp__list', { timeout: 30000 });
            
            // Extract first property data
            const data = await page.evaluate(() => {
                const firstProperty = document.querySelector('.mb-srp__list .mb-srp__card:first-child');
                
                if (!firstProperty) {
                    return null;
                }

                // Helper function to safely get text content
                const getTextContent = (element, selector) => {
                    const el = element.querySelector(selector);
                    return el ? el.textContent.trim() : '';
                };

                // Helper function to extract price
                const extractPrice = (element) => {
                    const priceEl = element.querySelector('.mb-srp__card__price--amount');
                    if (!priceEl) return '';
                    
                    const price = priceEl.textContent.trim();
                    return price.replace(/[^\d.₹\s]/g, '').trim();
                };

                // Extract required data
                const title = getTextContent(firstProperty, '.mb-srp__card--title') || 
                             getTextContent(firstProperty, '.mb-srp__card__title');
                             
                const location = getTextContent(firstProperty, '.mb-srp__card--addr') || 
                                getTextContent(firstProperty, '.mb-srp__card__address');
                                
                const price = extractPrice(firstProperty);

                // Extract image URL
                const imageEl = firstProperty.querySelector('.mb-srp__card__photo');
                const imageUrl = imageEl ? 
                    (imageEl.getAttribute('data-src') || imageEl.getAttribute('src')) : '';

                return {
                    title: title || '',
                    location: location || '',
                    price: price || '',
                    imageUrl: imageUrl || ''
                };
            });

            if (!data || !data.title) {
                throw new Error('Failed to extract property data');
            }

            console.log('Successfully scraped data:', data);
            return data;

        } catch (error) {
            console.error('Scraping error:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }
}

module.exports = Scraper;
















// // utils/scraper.js
// const puppeteer = require('puppeteer');

// class Scraper {
//     static async scrapeProperty(url) {
//         const browser = await puppeteer.launch({
//             headless: false,  // Change to true in production
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--window-size=1920,1080',
//                 '--disable-web-security',
//                 '--disable-features=IsolateOrigins',
//                 '--disable-site-isolation-trials'
//             ],
//             defaultViewport: null
//         });

//         try {
//             const page = await browser.newPage();
            
//             // Set a more realistic user agent
//             await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
//             // Set extra headers
//             await page.setExtraHTTPHeaders({
//                 'Accept-Language': 'en-US,en;q=0.9',
//                 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                 'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
//                 'sec-ch-ua-mobile': '?0',
//                 'sec-ch-ua-platform': '"Windows"',
//                 'Upgrade-Insecure-Requests': '1',
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//                 'Accept-Encoding': 'gzip, deflate, br',
//                 'Connection': 'keep-alive'
//             });

//             // Enable JavaScript
//             await page.setJavaScriptEnabled(true);

//             console.log('Navigating to URL:', url);
            
//             // Navigate to the page with a longer timeout
//             await page.goto(url, {
//                 waitUntil: 'networkidle0',
//                 timeout: 60000
//             });

//             // Wait for initial page load
//             await page.waitForTimeout(5000);

//             // Scroll to load dynamic content
//             await page.evaluate(async () => {
//                 await new Promise((resolve) => {
//                     let totalHeight = 0;
//                     const distance = 100;
//                     const timer = setInterval(() => {
//                         const scrollHeight = document.body.scrollHeight;
//                         window.scrollBy(0, distance);
//                         totalHeight += distance;

//                         if(totalHeight >= scrollHeight){
//                             clearInterval(timer);
//                             resolve();
//                         }
//                     }, 100);
//                 });
//             });

//             // Wait additional time for dynamic content
//             await page.waitForTimeout(2000);

//             // Extract data using multiple possible selectors
//             const data = await page.evaluate(() => {
//                 // Helper function to try multiple selectors
//                 const getElementBySelectors = (selectors) => {
//                     for (const selector of selectors) {
//                         const element = document.querySelector(selector);
//                         if (element) return element;
//                     }
//                     return null;
//                 };

//                 // Try to find the first property card
//                 const card = getElementBySelectors([
//                     'div[data-testid="property-card"]',
//                     '.mb-srp__card',
//                     '.SRCard',
//                     '.m-srp__card',
//                     '.jsx-1434906792',
//                     '.property-card'
//                 ]);

//                 if (!card) {
//                     throw new Error('Property card not found');
//                 }

//                 // Extract title
//                 const titleElement = getElementBySelectors([
//                     'h2.mb-srp__card--title',
//                     '.SRCard-title',
//                     '.m-srp-card__title',
//                     'h2.property-title',
//                     'div[data-testid="property-title"]'
//                 ]);

//                 // Extract location
//                 const locationElement = getElementBySelectors([
//                     '.mb-srp__card--address',
//                     '.SRCard-address',
//                     '.m-srp-card__address',
//                     'div[data-testid="address"]',
//                     '.property-address'
//                 ]);

//                 // Extract price
//                 const priceElement = getElementBySelectors([
//                     '.mb-srp__card__price--amount',
//                     '.SRCard-price',
//                     '.m-srp-card__price',
//                     'div[data-testid="price"]',
//                     '.property-price'
//                 ]);

//                 // Extract image
//                 const imageElement = getElementBySelectors([
//                     'img.mb-srp__card__photo',
//                     '.SRCard-image img',
//                     '.m-srp-card__image img',
//                     'img[data-testid="property-image"]',
//                     '.property-image img'
//                 ]);

//                 const title = titleElement ? titleElement.innerText.trim() : 'Sample Property';
//                 const location = locationElement ? locationElement.innerText.trim() : 'Delhi NCR';
//                 const price = priceElement ? priceElement.innerText.trim() : '₹ 1.5 Cr';
//                 const imageUrl = imageElement ? 
//                     (imageElement.getAttribute('data-src') || 
//                      imageElement.getAttribute('src') || 
//                      '/default-property-image.jpg') : 
//                     '/default-property-image.jpg';

//                 return {
//                     title,
//                     location,
//                     price,
//                     imageUrl
//                 };
//             });

//             console.log('Successfully scraped data:', data);
//             return data;

//         } catch (error) {
//             console.error('Scraping error:', error);
//             // Return default data if scraping fails
//             return {
//                 title: "3 BHK Apartment in Delhi",
//                 location: "Sector 10 Dwarka, Delhi",
//                 price: "₹ 1.85 Cr",
//                 imageUrl: "https://mediacdn.99acres.com/media1/19612/10/392250464M-1671091176449.jpg"
//             };
//         } finally {
//             await browser.close();
//         }
//     }
// }

// module.exports = Scraper;
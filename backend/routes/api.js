
const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/scrapingController');

// Scraping routes
router.post('/scrape', PropertyController.startScraping);
router.get('/properties/:id/status', PropertyController.getScrapingStatus);

// Property management routes
router.post('/properties', PropertyController.createProperty);
router.get('/properties', PropertyController.getAllProperties);
router.get('/properties/:id', PropertyController.getProperty);
router.put('/properties/:id', PropertyController.updateProperty);
router.delete('/properties/:id', PropertyController.deleteProperty);

// Retry failed scraping
router.post('/properties/:id/retry', PropertyController.retryScraping);

module.exports = router;





// // routes/api.js
// const express = require('express');
// const router = express.Router();
// const ScrapingController = require('../controllers/scrapingController');

// // Scraping routes
// router.post('/scrape', ScrapingController.startScraping);
// router.get('/status/:id', ScrapingController.getStatus);

// // Property management routes
// router.get('/properties', ScrapingController.getAllProperties);
// router.get('/properties/:id', ScrapingController.getProperty);
// router.put('/properties/:id', ScrapingController.updateProperty);
// router.delete('/properties/:id', ScrapingController.deleteProperty);

// // Retry failed scraping
// router.post('/properties/:id/retry', ScrapingController.retryScraping);

// module.exports = router;

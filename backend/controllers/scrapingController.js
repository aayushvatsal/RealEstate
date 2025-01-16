
const Property = require('../models/Property');
const Scraper = require('../utils/scraper');

class PropertyController {
    // Create new property
    static async createProperty(req, res) {
        try {
            const { title, location, price, imageUrl, url } = req.body;

            // Validate required fields
            if (!title || !location || !price || !url) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            const propertyData = {
                title,
                location,
                price,
                imageUrl: imageUrl || '', // Make imageUrl optional
                status: Property.STATUS.PENDING,  // Use the enum
                url
            };

            // Validate the data before creation
        const validationErrors = Property.validateData(propertyData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Validation failed: ${validationErrors.join(', ')}`
            });
        }

        // Check if property with URL already exists
        const existingProperty = await Property.getByUrl(url);
        if (existingProperty) {
            return res.status(409).json({
                success: false,
                error: 'Property with this URL already exists',
                property: existingProperty
            });
        }


            const propertyId = await Property.create(propertyData);
            const newProperty = await Property.getById(propertyId);

            return res.status(201).json({
                success: true,
                message: 'Property created successfully',
                property: newProperty
            });
        } catch (error) {
            console.error('Create property error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create property'
            });
        }
    }

    // Start scraping process
    static async startScraping(req, res) {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'URL is required'
                });
            }

            // Validate URL format
            if (!url.startsWith('https://www.magicbricks.com/')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid MagicBricks URL'
                });
            }

            // Check for existing property
            const existingProperty = await Property.getByUrl(url);
            
            if (existingProperty && existingProperty.status === 'COMPLETED') {
                return res.status(200).json({
                    success: true,
                    message: 'Property already exists',
                    property: existingProperty
                });
            }

            let propertyId;
            
            if (existingProperty) {
                propertyId = existingProperty.id;
                await Property.updateStatus(propertyId, 'IN_PROGRESS');
            } else {
                propertyId = await Property.create({
                    title: '',
                    location: '',
                    price: '',
                    imageUrl: '',
                    status: 'IN_PROGRESS',
                    url
                });
            }

            const scrapedData = await Scraper.scrapeProperty(url);

            if (!scrapedData) {
                await Property.updateStatus(propertyId, 'FAILED');
                return res.status(500).json({
                    success: false,
                    error: 'Failed to scrape property data'
                });
            }

            await Property.update(propertyId, {
                ...scrapedData,
                status: 'COMPLETED'
            });

            const updatedProperty = await Property.getById(propertyId);

            return res.status(200).json({
                success: true,
                message: 'Scraping completed successfully',
                property: updatedProperty
            });

        } catch (error) {
            console.error('Scraping controller error:', error);
            return res.status(500).json({
                success: false,
                error: 'Scraping process failed'
            });
        }
    }

    // Get all properties
    static async getAllProperties(req, res) {
        try {
            const properties = await Property.getAll();
            return res.status(200).json({
                success: true,
                count: properties.length,
                properties
            });
        } catch (error) {
            console.error('Get all properties error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get properties'
            });
        }
    }

    // Get single property
    static async getProperty(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Property ID is required'
                });
            }

            const property = await Property.getById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    error: 'Property not found'
                });
            }

            return res.status(200).json({
                success: true,
                property
            });
        } catch (error) {
            console.error('Get property error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get property'
            });
        }
    }

    // Update property
    static async updateProperty(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Property ID is required'
                });
            }

            const property = await Property.getById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    error: 'Property not found'
                });
            }

            await Property.update(id, updateData);
            const updatedProperty = await Property.getById(id);

            return res.status(200).json({
                success: true,
                message: 'Property updated successfully',
                property: updatedProperty
            });
        } catch (error) {
            console.error('Update property error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update property'
            });
        }
    }

    // Delete property
    static async deleteProperty(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Property ID is required'
                });
            }

            const property = await Property.getById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    error: 'Property not found'
                });
            }

            await Property.delete(id);

            return res.status(200).json({
                success: true,
                message: 'Property deleted successfully'
            });
        } catch (error) {
            console.error('Delete property error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete property'
            });
        }
    }

    // Retry failed scraping
    static async retryScraping(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Property ID is required'
                });
            }

            const property = await Property.getById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    error: 'Property not found'
                });
            }

            if (property.status !== 'FAILED') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only retry failed scraping attempts'
                });
            }

            await Property.updateStatus(id, 'IN_PROGRESS');
            const scrapedData = await Scraper.scrapeProperty(property.url);

            if (!scrapedData) {
                await Property.updateStatus(id, 'FAILED');
                return res.status(500).json({
                    success: false,
                    error: 'Retry scraping failed'
                });
            }

            await Property.update(id, {
                ...scrapedData,
                status: 'COMPLETED'
            });

            const updatedProperty = await Property.getById(id);

            return res.status(200).json({
                success: true,
                message: 'Scraping retry completed successfully',
                property: updatedProperty
            });
        } catch (error) {
            console.error('Retry scraping error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to retry scraping'
            });
        }
    }

    // Get scraping status
    static async getScrapingStatus(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Property ID is required'
                });
            }

            const property = await Property.getById(id);

            if (!property) {
                return res.status(404).json({
                    success: false,
                    error: 'Property not found'
                });
            }

            return res.status(200).json({
                success: true,
                status: property.status,
                property
            });
        } catch (error) {
            console.error('Get status error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get property status'
            });
        }
    }
}

module.exports = PropertyController;














// // controllers/scrapingController.js
// const Property = require('../models/Property');
// const Scraper = require('../utils/scraper');

// class ScrapingController {
//     // Start scraping process
//     static async startScraping(req, res) {
//         try {
//             const { url } = req.body;

//             // Validate input
//             if (!url) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'URL is required'
//                 });
//             }

//             // Validate URL format
//             if (!url.startsWith('https://www.magicbricks.com/')) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Invalid MagicBricks URL. Please provide a valid MagicBricks property URL.'
//                 });
//             }

//             // Check for existing property
//             const existingProperty = await Property.getByUrl(url);
            
//             if (existingProperty && existingProperty.status === 'COMPLETED') {
//                 return res.status(200).json({
//                     success: true,
//                     message: 'Property already exists',
//                     property: existingProperty
//                 });
//             }

//             let propertyId;
            
//             // If property exists but not completed, update its status
//             if (existingProperty) {
//                 propertyId = existingProperty.id;
//                 await Property.updateStatus(propertyId, 'IN_PROGRESS');
//             } else {
//                 // Create new property record
//                 propertyId = await Property.create({
//                     title: '',
//                     location: '',
//                     price: '',
//                     imageUrl: '',
//                     status: 'IN_PROGRESS',
//                     url
//                 });
//             }

//             // Start scraping
//             const scrapedData = await Scraper.scrapeProperty(url);

//             if (!scrapedData) {
//                 await Property.updateStatus(propertyId, 'FAILED');
//                 return res.status(500).json({
//                     success: false,
//                     error: 'Failed to scrape property data'
//                 });
//             }

//             // Update property with scraped data
//             await Property.update(propertyId, {
//                 ...scrapedData,
//                 status: 'COMPLETED'
//             });

//             // Get updated property data
//             const updatedProperty = await Property.getById(propertyId);

//             // Return success response
//             return res.status(200).json({
//                 success: true,
//                 message: 'Scraping completed successfully',
//                 property: updatedProperty
//             });

//         } catch (error) {
//             console.error('Scraping controller error:', error);
            
//             // Return fallback data for development/testing
//             return res.status(200).json({
//                 success: true,
//                 message: 'Returning sample property data',
//                 property: {
//                     id: 1,
//                     title: "3 BHK Apartment in Dwarka",
//                     location: "Sector 10 Dwarka, Delhi",
//                     price: "₹ 1.85 Cr",
//                     image_url: "https://mediacdn.99acres.com/media1/19612/10/392250464M-1671091176449.jpg",
//                     status: "COMPLETED",
//                     url: req.body.url || "https://www.magicbricks.com/property-sample",
//                     created_at: new Date().toISOString(),
//                     updated_at: new Date().toISOString()
//                 }
//             });
//         }
//     }

//     // Get scraping status
//     static async getStatus(req, res) {
//         try {
//             const { id } = req.params;

//             if (!id) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Property ID is required'
//                 });
//             }

//             const property = await Property.getById(id);

//             if (!property) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Property not found'
//                 });
//             }

//             return res.status(200).json({
//                 success: true,
//                 status: property.status,
//                 property
//             });

//         } catch (error) {
//             console.error('Get status error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to get property status'
//             });
//         }
//     }

//     // Get all properties
//     static async getAllProperties(req, res) {
//         try {
//             const properties = await Property.getAll();

//             return res.status(200).json({
//                 success: true,
//                 count: properties.length,
//                 properties
//             });

//         } catch (error) {
//             console.error('Get all properties error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to get properties'
//             });
//         }
//     }

//     // Get single property
//     static async getProperty(req, res) {
//         try {
//             const { id } = req.params;

//             if (!id) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Property ID is required'
//                 });
//             }

//             const property = await Property.getById(id);

//             if (!property) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Property not found'
//                 });
//             }

//             return res.status(200).json({
//                 success: true,
//                 property
//             });

//         } catch (error) {
//             console.error('Get property error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to get property'
//             });
//         }
//     }

//     // Delete property
//     static async deleteProperty(req, res) {
//         try {
//             const { id } = req.params;

//             if (!id) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Property ID is required'
//                 });
//             }

//             const property = await Property.getById(id);

//             if (!property) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Property not found'
//                 });
//             }

//             await Property.delete(id);

//             return res.status(200).json({
//                 success: true,
//                 message: 'Property deleted successfully'
//             });

//         } catch (error) {
//             console.error('Delete property error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to delete property'
//             });
//         }
//     }

//     // Update property
//     static async updateProperty(req, res) {
//         try {
//             const { id } = req.params;
//             const updateData = req.body;

//             if (!id) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Property ID is required'
//                 });
//             }

//             const property = await Property.getById(id);

//             if (!property) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Property not found'
//                 });
//             }

//             await Property.update(id, updateData);
            
//             const updatedProperty = await Property.getById(id);

//             return res.status(200).json({
//                 success: true,
//                 message: 'Property updated successfully',
//                 property: updatedProperty
//             });

//         } catch (error) {
//             console.error('Update property error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to update property'
//             });
//         }
//     }

//     // Retry failed scraping
//     static async retryScraping(req, res) {
//         try {
//             const { id } = req.params;

//             if (!id) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Property ID is required'
//                 });
//             }

//             const property = await Property.getById(id);

//             if (!property) {
//                 return res.status(404).json({
//                     success: false,
//                     error: 'Property not found'
//                 });
//             }

//             if (property.status !== 'FAILED') {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Can only retry failed scraping attempts'
//                 });
//             }

//             // Update status to IN_PROGRESS
//             await Property.updateStatus(id, 'IN_PROGRESS');

//             // Retry scraping
//             const scrapedData = await Scraper.scrapeProperty(property.url);

//             if (!scrapedData) {
//                 await Property.updateStatus(id, 'FAILED');
//                 return res.status(500).json({
//                     success: false,
//                     error: 'Retry scraping failed'
//                 });
//             }

//             // Update property with new data
//             await Property.update(id, {
//                 ...scrapedData,
//                 status: 'COMPLETED'
//             });

//             const updatedProperty = await Property.getById(id);

//             return res.status(200).json({
//                 success: true,
//                 message: 'Scraping retry completed successfully',
//                 property: updatedProperty
//             });

//         } catch (error) {
//             console.error('Retry scraping error:', error);
//             return res.status(500).json({
//                 success: false,
//                 error: 'Failed to retry scraping'
//             });
//         }
//     }
// }

// module.exports = ScrapingController;
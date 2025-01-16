
const pool = require('../config/database');

class Property {
    // Valid status values
    static STATUS = {
        PENDING: 'PENDING',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED'
    };

    // Validation helper
    static validateData(data, isUpdate = false) {
        const errors = [];

        if (isUpdate && !data) return errors;

        if (data.status && !Object.values(this.STATUS).includes(data.status)) {
            errors.push(`Invalid status value. Must be one of: ${Object.values(this.STATUS).join(', ')}`);
        }

        if (data.url && !data.url.startsWith('https://www.magicbricks.com/')) {
            errors.push('Invalid URL. Must be a MagicBricks URL');
        }

        if (data.price && !data.price.startsWith('₹')) {
            errors.push('Price must start with ₹ symbol');
        }

        return errors;
    }

    // Create new property
    static async create(data) {
        // Validate required fields
        if (!data || !data.url) {
            throw new Error('URL is required for creating a property');
        }

        // Validate data
        const validationErrors = this.validateData(data);
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        const query = `
            INSERT INTO properties (
                title, location, price, image_url, status, url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        // Set default values and ensure data types
        const values = [
            data.title || '',
            data.location || '',
            data.price || '',
            data.imageUrl || '',
            data.status || this.STATUS.PENDING,
            data.url
        ];

        try {
            const [result] = await pool.execute(query, values);
            
            if (result.affectedRows === 0) {
                throw new Error('Failed to create property record');
            }

            return result.insertId;
        } catch (error) {
            console.error('Database error during property creation:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('A property with this URL already exists');
            }
            throw new Error(`Failed to create property: ${error.message}`);
        }
    }

    // Update property
    // static async update(id, data) {
    //     if (!id) {
    //         throw new Error('Property ID is required for update');
    //     }

    //    // Validate data if provided
    //    const validationErrors = this.validateData(data, true);
    //    if (validationErrors.length > 0) {
    //        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    //    }

    //     // First check if property exists
    //     const existingProperty = await this.getById(id);
    //     if (!existingProperty) {
    //         throw new Error('Property not found');
    //     }

    //     const query = `
    //         UPDATE properties 
    //         SET title = COALESCE(?, title),
    //             location = COALESCE(?, location),
    //             price = COALESCE(?, price),
    //             image_url = COALESCE(?, image_url),
    //             status = COALESCE(?, status),
    //             updated_at = NOW()
    //         WHERE id = ?
    //     `;

    //     const values = [
    //         data.title,
    //         data.location,
    //         data.price,
    //         data.imageUrl,
    //         data.status,
    //         id
    //     ];

    //     try {
    //         const [result] = await pool.execute(query, values);
            
    //         if (result.affectedRows === 0) {
    //             throw new Error('No changes were made to the property');
    //         }

    //         return true;
    //     } catch (error) {
    //         console.error('Database error during property update:', error);
    //         throw new Error(`Failed to update property: ${error.message}`);
    //     }
    // }

    static async update(id, data) {
        if (!id) {
            throw new Error('Property ID is required for update');
        }

        // Validate data if provided
        const validationErrors = this.validateData(data, true);
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        // First check if property exists
        const existingProperty = await this.getById(id);
        if (!existingProperty) {
            throw new Error('Property not found');
        }

        // Filter out undefined values and build the query dynamically
        const updateFields = [];
        const values = [];
        
        if (data.title !== undefined) {
            updateFields.push('title = ?');
            values.push(data.title);
        }
        
        if (data.location !== undefined) {
            updateFields.push('location = ?');
            values.push(data.location);
        }
        
        if (data.price !== undefined) {
            updateFields.push('price = ?');
            values.push(data.price);
        }
        
        if (data.imageUrl !== undefined) {
            updateFields.push('image_url = ?');
            values.push(data.imageUrl);
        }
        
        if (data.status !== undefined) {
            updateFields.push('status = ?');
            values.push(data.status);
        }

        // If no fields to update, return early
        if (updateFields.length === 0) {
            return true; // No changes needed
        }

        // Add updated_at to the query
        updateFields.push('updated_at = NOW()');

        // Build the final query
        const query = `
            UPDATE properties 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;

        // Add id to values array
        values.push(id);

        try {
            console.log('Update Query:', query);
            console.log('Update Values:', values);

            const [result] = await pool.execute(query, values);
            
            if (result.affectedRows === 0) {
                throw new Error('No changes were made to the property');
            }

            return true;
        } catch (error) {
            console.error('Database error during property update:', error);
            throw new Error(`Failed to update property: ${error.message}`);
        }
    }


    // Update property status
    static async updateStatus(id, status) {
        if (!id) {
            throw new Error('Property ID is required for status update');
        }

        if (!Object.values(this.STATUS).includes(status)) {
            throw new Error(`Invalid status value. Must be one of: ${Object.values(this.STATUS).join(', ')}`);
        }

        const query = `
            UPDATE properties 
            SET status = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        try {
            const [result] = await pool.execute(query, [status, id]);
            
            if (result.affectedRows === 0) {
                throw new Error('Property not found or status not updated');
            }

            return true;
        } catch (error) {
            console.error('Database error during status update:', error);
            throw new Error(`Failed to update property status: ${error.message}`);
        }
    }

    // Get all properties with optional filtering and pagination
    // static async getAll(options = {}) {
    //     const {
    //         limit = 10,
    //         offset = 0,
    //         status,
    //         sortBy = 'created_at',
    //         sortOrder = 'DESC'
    //     } = options;

    //     let query = 'SELECT * FROM properties';
    //     const values = [];

    //     // Add status filter if provided
    //     if (status) {
    //         if (!Object.values(this.STATUS).includes(status)) {
    //             throw new Error(`Invalid status filter: ${status}`);
    //         }
    //         query += ' WHERE status = ?';
    //         values.push(status);
    //     }

    //     // Add sorting
    //     const allowedSortFields = ['created_at', 'updated_at', 'price', 'title'];
    //     if (!allowedSortFields.includes(sortBy)) {
    //         throw new Error('Invalid sort field');
    //     }
    //     query += ` ORDER BY ${sortBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;

    //     // Add pagination
    //     query += ' LIMIT ? OFFSET ?';
    //     values.push(Number(limit), Number(offset));

    //     try {
    //         const [rows] = await pool.execute(query, values);
    //         return rows;
    //     } catch (error) {
    //         console.error('Database error while fetching properties:', error);
    //         throw new Error('Failed to fetch properties');
    //     }
    // }

    static async getAll(options = {}) {
        let {
            limit = 10,
            offset = 0,
            status,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        // Ensure limit and offset are valid numbers
        limit = parseInt(limit, 10);
        offset = parseInt(offset, 10);

        if (isNaN(limit) || limit < 0) limit = 10;
        if (isNaN(offset) || offset < 0) offset = 0;

        // Start building the query
        let query = 'SELECT * FROM properties';
        const values = [];

        // Add status filter if provided
        if (status) {
            if (!Object.values(this.STATUS).includes(status)) {
                throw new Error(`Invalid status filter: ${status}`);
            }
            query += ' WHERE status = ?';
            values.push(status);
        }

        // Add sorting
        const allowedSortFields = ['created_at', 'updated_at', 'price', 'title'];
        if (!allowedSortFields.includes(sortBy)) {
            sortBy = 'created_at'; // Default to created_at if invalid
        }
        const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
        
        // Construct final query with limit and offset directly in the string
        query += ` ORDER BY ${sortBy} ${validSortOrder} LIMIT ${limit} OFFSET ${offset}`;

        try {
            // For debugging
            console.log('Query:', query);
            console.log('Values:', values);

            // Execute query with only the status parameter if present
            const [rows] = await pool.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Database error while fetching properties:', error);
            throw new Error('Failed to fetch properties');
        }
    }



    // Get property by ID
    static async getById(id) {
        if (!id) {
            throw new Error('Property ID is required');
        }

        const query = 'SELECT * FROM properties WHERE id = ?';
        
        try {
            const [rows] = await pool.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Database error while fetching property by ID:', error);
            throw new Error('Failed to fetch property');
        }
    }

    // Get property by URL
    static async getByUrl(url) {
        if (!url) {
            throw new Error('URL is required');
        }

        const query = 'SELECT * FROM properties WHERE url = ?';
        
        try {
            const [rows] = await pool.execute(query, [url]);
            return rows[0] || null;
        } catch (error) {
            console.error('Database error while fetching property by URL:', error);
            throw new Error('Failed to fetch property by URL');
        }
    }

    // Delete property
    static async delete(id) {
        if (!id) {
            throw new Error('Property ID is required for deletion');
        }

        const query = 'DELETE FROM properties WHERE id = ?';
        
        try {
            const [result] = await pool.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                throw new Error('Property not found');
            }

            return true;
        } catch (error) {
            console.error('Database error during property deletion:', error);
            throw new Error(`Failed to delete property: ${error.message}`);
        }
    }

    // Count total properties with optional status filter
    static async count(status = null) {
        let query = 'SELECT COUNT(*) as total FROM properties';
        const values = [];

        if (status) {
            if (!Object.values(this.STATUS).includes(status)) {
                throw new Error(`Invalid status filter: ${status}`);
            }
            query += ' WHERE status = ?';
            values.push(status);
        }

        try {
            const [rows] = await pool.execute(query, values);
            return rows[0].total;
        } catch (error) {
            console.error('Database error while counting properties:', error);
            throw new Error('Failed to count properties');
        }
    }
}

module.exports = Property;










// const pool = require('../config/database');

// class Property {
//     static async create(data) {
//         const [result] = await pool.execute(
//             'INSERT INTO properties (title, location, price, image_url, status, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
//             [data.title, data.location, data.price, data.imageUrl, data.status, data.url]
//         );
//         return result.insertId;
//     }

//     static async update(id, data) {
//         const [result] = await pool.execute(
//             'UPDATE properties SET title = ?, location = ?, price = ?, image_url = ?, status = ?, updated_at = NOW() WHERE id = ?',
//             [data.title, data.location, data.price, data.imageUrl, data.status, id]
//         );
//         return result.affectedRows > 0;
//     }

//     static async updateStatus(id, status) {
//         const [result] = await pool.execute(
//             'UPDATE properties SET status = ?, updated_at = NOW() WHERE id = ?',
//             [status, id]
//         );
//         return result.affectedRows > 0;
//     }

//     static async getAll() {
//         const [rows] = await pool.execute('SELECT * FROM properties ORDER BY created_at DESC');
//         return rows;
//     }

//     static async getById(id) {
//         const [rows] = await pool.execute('SELECT * FROM properties WHERE id = ?', [id]);
//         return rows[0];
//     }

//     static async getByUrl(url) {
//         const [rows] = await pool.execute('SELECT * FROM properties WHERE url = ?', [url]);
//         return rows[0];
//     }
// }

// module.exports = Property;

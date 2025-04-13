const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const fs = require('fs');
const asyncHandler = require('express-async-handler');

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
    try {
        const categories = await Category.find();
        res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        const category = await Category.findById(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        res.json({ success: true, message: "Category retrieved successfully.", data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new category with image upload
router.post('/', asyncHandler(async (req, res) => {
    try {
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    err.message = 'File size is too large. Maximum filesize is 5MB.';
                }
                return res.json({ success: false, message: err.message });
            } else if (err) {
                return res.json({ success: false, message: err.message });
            }

            const { name } = req.body;
            let imageUrl = 'no_url';
            if (req.file) {
                imageUrl = `https://decordash.onrender.com/image/category/${req.file.filename}`;
            }

            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }

            try {
                const newCategory = new Category({
                    name: name,
                    image: imageUrl
                });
                await newCategory.save();
                res.json({ success: true, message: "Category created successfully.", data: newCategory });
            } catch (error) {
                console.error("Error creating category:", error);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Update a category (with image update handling)
router.put('/:id', asyncHandler(async (req, res) => {
    const categoryID = req.params.id;
    
    // First check if the category exists
    try {
        const existingCategory = await Category.findById(categoryID);
        if (!existingCategory) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        
        // Process the update with multer
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: 'File size is too large. Maximum filesize is 5MB.' });
                }
                return res.status(400).json({ success: false, message: err.message });
            } else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            // Debug logs
            console.log("Request body:", req.body);
            console.log("Request file:", req.file);
            
            // Get the name from request body
            const { name } = req.body;
            
            // If no name is provided, return error
            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }
            
            // Keep the existing image by default
            let imageUrl = existingCategory.image;
            
            // If a new file is uploaded, update the image URL
            if (req.file) {
                imageUrl = `https://decordash.onrender.com/image/category/${req.file.filename}`;
                
                // Delete old image if it's not the default 'no_url'
                if (existingCategory.image !== 'no_url') {
                    try {
                        const oldFilename = existingCategory.image.split('/').pop();
                        const oldImagePath = `./public/image/category/${oldFilename}`;
                        
                        fs.unlink(oldImagePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error("Error deleting old image:", unlinkErr);
                            }
                        });
                    } catch (error) {
                        console.error("Error trying to delete old image:", error);
                    }
                }
            }
            
            // Update the category in the database
            try {
                const updatedCategory = await Category.findByIdAndUpdate(
                    categoryID,
                    { name: name, image: imageUrl },
                    { new: true, runValidators: true }
                );
                
                if (!updatedCategory) {
                    return res.status(404).json({ success: false, message: "Category not found during update." });
                }
                
                return res.json({ 
                    success: true, 
                    message: "Category updated successfully.", 
                    data: updatedCategory 
                });
            } catch (updateError) {
                console.error("Error updating category:", updateError);
                return res.status(500).json({ success: false, message: updateError.message });
            }
        });
    } catch (error) {
        console.error("Error finding category:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a category
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;

        // Check if any subcategories reference this category
        const subcategories = await SubCategory.find({ categoryId: categoryID });
        if (subcategories.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
        }

        // Check if any products reference this category
        const products = await Product.find({ proCategoryId: categoryID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
        }

        // Get the category to delete
        const category = await Category.findById(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        // Delete the category from the database
        await Category.findByIdAndDelete(categoryID);

        // Delete the category image if it exists and isn't the default
        if (category.image && category.image !== 'no_url') {
            try {
                const filename = category.image.split('/').pop();
                const imagePath = `./public/image/category/${filename}`;
                
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error("Error deleting image file:", err);
                    }
                });
            } catch (error) {
                console.error("Error processing image deletion:", error);
            }
        }

        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const fs = require('fs');  // To handle file deletion
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
                res.json({ success: true, message: "Category created successfully.", data: null });
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

    uploadCategory.single('img')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                err.message = 'File size is too large. Maximum filesize is 5MB.';
            }
            return res.json({ success: false, message: err.message });
        } else if (err) {
            return res.json({ success: false, message: err.message });
        }

        // Log incoming request data to debug missing fields
        console.log("Incoming Update Data: ", req.body);
        console.log("Uploaded File: ", req.file);

        const { name } = req.body;
        let image = req.body.image; // Retain existing image if no new one is uploaded

        // If a new image is uploaded, update the image URL
        if (req.file) {
            image = `https://decordash.onrender.com/image/category/${req.file.filename}`;
        }

        // If no name is provided, return error
        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        try {
            const category = await Category.findById(categoryID);

            if (!category) {
                return res.status(404).json({ success: false, message: "Category not found." });
            }

            // If the image is updated, delete the old image from the server
            if (req.file && category.image !== 'no_url') {
                const oldImagePath = `./public${category.image}`;
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error("Error deleting old image:", err);
                    }
                });
            }

            // Update category with the new image (if available) or keep the old image
            const updatedCategory = await Category.findByIdAndUpdate(
                categoryID,
                { name: name, image: image },
                { new: true }
            );

            res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
        } catch (error) {
            console.log("Error during category update:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
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

        // If no subcategories or products are referencing the category, proceed with deletion
        const category = await Category.findByIdAndDelete(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        // Delete the category image from the server if it exists
        const oldImagePath = `./public${category.image}`;
        fs.unlink(oldImagePath, (err) => {
            if (err) {
                console.error("Error deleting old image:", err);
            }
        });

        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;

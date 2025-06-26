// const express = require('express');
// const router = express.Router();
// const Category = require('../model/category');
// const SubCategory = require('../model/subCategory');
// const Product = require('../model/product');
// const { uploadCategory } = require('../uploadFile');
// const multer = require('multer');
// const fs = require('fs');
// const asyncHandler = require('express-async-handler');

// // Get all categories
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a category by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;
//         const category = await Category.findById(categoryID);
//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found." });
//         }
//         res.json({ success: true, message: "Category retrieved successfully.", data: category });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new category with image upload
// router.post('/', asyncHandler(async (req, res) => {
//     try {
//         uploadCategory.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 return res.json({ success: false, message: err.message });
//             }

//             const { name } = req.body;
//             let imageUrl = 'no_url';
//             if (req.file) {
//                 imageUrl = `https://decordash.onrender.com/image/category/${req.file.filename}`;
//             }

//             if (!name) {
//                 return res.status(400).json({ success: false, message: "Name is required." });
//             }

//             try {
//                 const newCategory = new Category({
//                     name: name,
//                     image: imageUrl
//                 });
//                 await newCategory.save();
//                 res.json({ success: true, message: "Category created successfully.", data: null });
//             } catch (error) {
//                 console.error("Error creating category:", error);
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });
//     } catch (err) {
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Update a category - SIMPLIFIED VERSION BASED ON WORKING POSTER.JS
// router.put('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;
        
//         uploadCategory.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 console.log(`Update category: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 console.log(`Update category: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             }

//             const { name } = req.body;
//             let image = req.body.image; // Get the image from the request body

//             // Only update image if a new file is uploaded
//             if (req.file) {
//                 image = `https://decordash.onrender.com/image/category/${req.file.filename}`;
//             }

//             if (!name) {
//                 return res.status(400).json({ success: false, message: "Name is required." });
//             }

//             try {
//                 const updatedCategory = await Category.findByIdAndUpdate(
//                     categoryID, 
//                     { name: name, image: image }, 
//                     { new: true }
//                 );
                
//                 if (!updatedCategory) {
//                     return res.status(404).json({ success: false, message: "Category not found." });
//                 }
                
//                 res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
//             } catch (error) {
//                 console.error("Update category error:", error);
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });
//     } catch (err) {
//         console.log(`Error updating category: ${err.message}`);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Delete a category
// router.delete('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;

//         // Check if any subcategories reference this category
//         const subcategories = await SubCategory.find({ categoryId: categoryID });
//         if (subcategories.length > 0) {
//             return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
//         }

//         // Check if any products reference this category
//         const products = await Product.find({ proCategoryId: categoryID });
//         if (products.length > 0) {
//             return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
//         }

//         // If no subcategories or products are referencing the category, proceed with deletion
//         const category = await Category.findByIdAndDelete(categoryID);
//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found." });
//         }

//         // Delete the category image from the server if it exists
//         if (category.image && category.image !== 'no_url') {
//             try {
//                 const filename = category.image.split('/').pop();
//                 const imagePath = `./public/image/category/${filename}`;
                
//                 fs.unlink(imagePath, (err) => {
//                     if (err) {
//                         console.error("Error deleting image file:", err);
//                     }
//                 });
//             } catch (error) {
//                 console.error("Error processing image deletion:", error);
//             }
//         }

//         res.json({ success: true, message: "Category deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// module.exports = router;
const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const multer = require('multer');
const fs = require('fs');
const asyncHandler = require('express-async-handler');

const { uploadCategory, uploadToSupabase } = require('../uploadFile');

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
    const categories = await Category.find();
    res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
}));

// Get a category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found." });
    res.json({ success: true, message: "Category retrieved successfully.", data: category });
}));

// Create a new category with Supabase image upload
router.post('/', asyncHandler(async (req, res) => {
    uploadCategory.single('img')(req, res, async function (err) {
        if (err instanceof multer.MulterError || err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'File size is too large. Maximum filesize is 5MB.' : err.message;
            return res.status(400).json({ success: false, message });
        }

        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Name is required." });

        let imageUrl = 'no_url';
        if (req.file) {
            try {
                const filename = `${Date.now()}_${req.file.originalname}`;
                imageUrl = await uploadToSupabase(req.file.buffer, 'category', filename, req.file.mimetype);
            } catch (uploadErr) {
                return res.status(500).json({ success: false, message: "Image upload failed: " + uploadErr.message });
            }
        }

        const newCategory = new Category({ name, image: imageUrl });
        await newCategory.save();

        res.json({ success: true, message: "Category created successfully.", data: newCategory });
    });
}));

// Update category with Supabase image upload
router.put('/:id', asyncHandler(async (req, res) => {
    uploadCategory.single('img')(req, res, async function (err) {
        if (err instanceof multer.MulterError || err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'File size is too large. Maximum filesize is 5MB.' : err.message;
            return res.status(400).json({ success: false, message });
        }

        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Name is required." });

        let imageUrl = req.body.image; // fallback to existing image

        if (req.file) {
            try {
                const filename = `${Date.now()}_${req.file.originalname}`;
                imageUrl = await uploadToSupabase(req.file.buffer, 'category', filename, req.file.mimetype);
            } catch (uploadErr) {
                return res.status(500).json({ success: false, message: "Image upload failed: " + uploadErr.message });
            }
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { name, image: imageUrl },
            { new: true }
        );

        if (!updatedCategory) return res.status(404).json({ success: false, message: "Category not found." });

        res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
    });
}));

// Delete a category
router.delete('/:id', asyncHandler(async (req, res) => {
    const categoryID = req.params.id;

    const subcategories = await SubCategory.find({ categoryId: categoryID });
    if (subcategories.length > 0) return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });

    const products = await Product.find({ proCategoryId: categoryID });
    if (products.length > 0) return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });

    const category = await Category.findByIdAndDelete(categoryID);
    if (!category) return res.status(404).json({ success: false, message: "Category not found." });

    // Optionally, delete image from Supabase (not implemented here)

    res.json({ success: true, message: "Category deleted successfully." });
}));

module.exports = router;

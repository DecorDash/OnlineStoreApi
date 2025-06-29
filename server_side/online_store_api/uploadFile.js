// const multer = require('multer');
// const path = require('path');

// const storageCategory = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, './public/category');
//   },
//   filename: function(req, file, cb) {
//     // Check file type based on its extension
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (extname) {
//       cb(null, Date.now() + "_" + Math.floor(Math.random() * 1000) + path.extname(file.originalname));
//     } else {
//       cb("Error: only .jpeg, .jpg, .png files are allowed!");
//     }
//   }
// });

// const uploadCategory = multer({
//   storage: storageCategory,
//   limits: {
//     fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
//   },
// });

// const storageProduct = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, './public/products');
//   },
//   filename: function(req, file, cb) {
//     // Check file type based on its extension
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (extname) {
//       cb(null, Date.now() + "_" + file.originalname);
//     } else {
//       cb("Error: only .jpeg, .jpg, .png files are allowed!");
//     }
//   }
// });

// const uploadProduct = multer({
//   storage: storageProduct,
//   limits: {
//     fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
//   },
// });


// const storagePoster = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, './public/posters');
//   },
//   filename: function(req, file, cb) {
//     // Check file type based on its extension
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (extname) {
//       cb(null, Date.now() + "_" + file.originalname);
//     } else {
//       cb("Error: only .jpeg, .jpg, .png files are allowed!");
//     }
//   }
// });

// const uploadPosters = multer({
//   storage: storagePoster,
//   limits: {
//     fileSize: 1024 * 1024 * 5 // limit filesize to 5MB
//   },
// });

// module.exports = {
//     uploadCategory,
//     uploadProduct,
//     uploadPosters,
// };


const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Load Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check Supabase config at startup
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and KEY must be set in environment variables.');
}

// Multer storage (in memory, we don’t save files to disk)
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  console.log('Uploading file:', file.originalname);
  console.log('MIME type:', file.mimetype);
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png files are allowed!'), false);
  }
};

// Max file size = 5MB
const limits = { fileSize: 5 * 1024 * 1024 };

// Reusable upload function for Supabase
const uploadToSupabase = async (folder, file) => {
  const ext = path.extname(file.originalname);
  const fileName = `${folder}/${uuidv4()}${ext}`;
  const { data, error } = await supabase.storage
    .from('decordash-images') // bucket name
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('decordash-images')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

// Middleware wrappers to use in routes

// --- Category Upload Middleware ---
const uploadCategory = multer({ storage, fileFilter, limits });
const handleCategoryUpload = (req, res, next) => {
  uploadCategory.single('img')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) return next();

    try {
      const url = await uploadToSupabase('category', req.file);
      req.imageUrl = url;
      next();
    } catch (uploadErr) {
      return res.status(500).json({ success: false, message: uploadErr.message });
    }
  });
};

// --- Poster Upload Middleware ---
const uploadPosters = multer({ storage, fileFilter, limits });
const handlePosterUpload = (req, res, next) => {
  uploadPosters.single('img')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) return next();

    try {
      const url = await uploadToSupabase('poster', req.file);
      req.imageUrl = url;
      next();
    } catch (uploadErr) {
      return res.status(500).json({ success: false, message: uploadErr.message });
    }
  });
};

// --- Product Upload Middleware ---
const uploadProduct = multer({ storage, fileFilter, limits });
const handleProductUpload = (req, res, next) => {
  uploadProduct.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 }
  ])(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const uploadedImages = [];

    try {
      const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (req.files[field]) {
          const file = req.files[field][0];
          const url = await uploadToSupabase('products', file);
          uploadedImages.push({ image: i + 1, url });
        }
      }

      req.productImages = uploadedImages;
      next();
    } catch (uploadErr) {
      return res.status(500).json({ success: false, message: uploadErr.message });
    }
  });
};

module.exports = {
  handleCategoryUpload,
  handlePosterUpload,
  handleProductUpload
};


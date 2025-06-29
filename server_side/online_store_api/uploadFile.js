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


// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');
// const { createClient } = require('@supabase/supabase-js');

// // Load Supabase credentials from environment variables
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// // Check Supabase config at startup
// if (!supabaseUrl || !supabaseKey) {
//   throw new Error('Supabase URL and KEY must be set in environment variables.');
// }

// // Multer storage (in memory, we don’t save files to disk)
// const storage = multer.memoryStorage();

// // File type validation
// const fileFilter = (req, file, cb) => {
//   console.log('Uploading file:', file.originalname);
//   console.log('MIME type:', file.mimetype);
  
//   const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only .jpeg, .jpg, .png files are allowed!'), false);
//   }
// };

// // Max file size = 5MB
// const limits = { fileSize: 5 * 1024 * 1024 };

// // Reusable upload function for Supabase
// const uploadToSupabase = async (folder, file) => {
//   const ext = path.extname(file.originalname);
//   const fileName = `${folder}/${uuidv4()}${ext}`;
//   const { data, error } = await supabase.storage
//     .from('decordash-images') // bucket name
//     .upload(fileName, file.buffer, {
//       contentType: file.mimetype,
//       upsert: false
//     });

//   if (error) throw error;

//   const { data: publicUrlData } = supabase.storage
//     .from('decordash-images')
//     .getPublicUrl(fileName);

//   return publicUrlData.publicUrl;
// };

// // Middleware wrappers to use in routes

// // --- Category Upload Middleware ---
// const uploadCategory = multer({ storage, fileFilter, limits });
// const handleCategoryUpload = (req, res, next) => {
//   uploadCategory.single('img')(req, res, async function (err) {
//     if (err) {
//       return res.status(400).json({ success: false, message: err.message });
//     }
//     if (!req.file) return next();

//     try {
//       const url = await uploadToSupabase('category', req.file);
//       req.imageUrl = url;
//       next();
//     } catch (uploadErr) {
//       return res.status(500).json({ success: false, message: uploadErr.message });
//     }
//   });
// };

// // --- Poster Upload Middleware ---
// const uploadPosters = multer({ storage, fileFilter, limits });
// const handlePosterUpload = (req, res, next) => {
//   uploadPosters.single('img')(req, res, async function (err) {
//     if (err) {
//       return res.status(400).json({ success: false, message: err.message });
//     }
//     if (!req.file) return next();

//     try {
//       const url = await uploadToSupabase('poster', req.file);
//       req.imageUrl = url;
//       next();
//     } catch (uploadErr) {
//       return res.status(500).json({ success: false, message: uploadErr.message });
//     }
//   });
// };

// // --- Product Upload Middleware ---
// const uploadProduct = multer({ storage, fileFilter, limits });
// const handleProductUpload = (req, res, next) => {
//   uploadProduct.fields([
//     { name: 'image1', maxCount: 1 },
//     { name: 'image2', maxCount: 1 },
//     { name: 'image3', maxCount: 1 },
//     { name: 'image4', maxCount: 1 },
//     { name: 'image5', maxCount: 1 }
//   ])(req, res, async function (err) {
//     if (err) {
//       return res.status(400).json({ success: false, message: err.message });
//     }

//     const uploadedImages = [];

//     try {
//       const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];

//       for (let i = 0; i < fields.length; i++) {
//         const field = fields[i];
//         if (req.files[field]) {
//           const file = req.files[field][0];
//           const url = await uploadToSupabase('products', file);
//           uploadedImages.push({ image: i + 1, url });
//         }
//       }

//       req.productImages = uploadedImages;
//       next();
//     } catch (uploadErr) {
//       return res.status(500).json({ success: false, message: uploadErr.message });
//     }
//   });
// };

// module.exports = {
//   handleCategoryUpload,
//   handlePosterUpload,
//   handleProductUpload
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

// Multer storage (in memory, we don't save files to disk)
const storage = multer.memoryStorage();

// Enhanced file type validation that handles both MIME type and file extension
const fileFilter = (req, file, cb) => {
  console.log('Uploading file:', file.originalname);
  console.log('MIME type:', file.mimetype);
  
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  
  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check both MIME type and file extension
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.includes(ext);
  
  if (isValidMimeType || isValidExtension) {
    // If MIME type is missing or generic, infer it from extension
    if (!isValidMimeType && isValidExtension) {
      console.log(`MIME type not recognized (${file.mimetype}), but extension ${ext} is valid. Proceeding...`);
      
      // Set proper MIME type based on extension
      if (ext === '.png') {
        file.mimetype = 'image/png';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        file.mimetype = 'image/jpeg';
      }
    }
    cb(null, true);
  } else {
    console.log(`File rejected - MIME: ${file.mimetype}, Extension: ${ext}`);
    cb(new Error('Only .jpeg, .jpg, .png files are allowed!'), false);
  }
};

// Enhanced file validation with magic number checking (optional but more secure)
const validateImageBuffer = (buffer, filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  // Check magic numbers (file signatures) for additional validation
  if (ext === '.png') {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return buffer.subarray(0, 8).equals(pngSignature);
  } else if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG signature: FF D8
    return buffer[0] === 0xFF && buffer[1] === 0xD8;
  }
  
  return false;
};

// Max file size = 5MB
const limits = { fileSize: 5 * 1024 * 1024 };

// Reusable upload function for Supabase with enhanced validation
const uploadToSupabase = async (folder, file) => {
  // Additional buffer validation (optional)
  if (file.buffer && file.buffer.length > 0) {
    const isValidImage = validateImageBuffer(file.buffer, file.originalname);
    if (!isValidImage) {
      console.warn(`Warning: File ${file.originalname} may not be a valid image based on content analysis`);
      // You can choose to throw an error here or just log the warning
    }
  }
  
  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${folder}/${uuidv4()}${ext}`;
  
  console.log(`Uploading to Supabase: ${fileName} with MIME type: ${file.mimetype}`);
  
  const { data, error } = await supabase.storage
    .from('decordash-images') // bucket name
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('decordash-images')
    .getPublicUrl(fileName);

  console.log(`Successfully uploaded: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
};

// Enhanced error handling wrapper
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File too large. Maximum size is 5MB.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Unexpected field in form data.' 
      });
    }
  }
  
  return res.status(400).json({ 
    success: false, 
    message: err.message || 'File upload failed.' 
  });
};

// Middleware wrappers to use in routes

// --- Category Upload Middleware ---
const uploadCategory = multer({ storage, fileFilter, limits });
const handleCategoryUpload = (req, res, next) => {
  uploadCategory.single('img')(req, res, async function (err) {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    if (!req.file) return next();

    try {
      const url = await uploadToSupabase('category', req.file);
      req.imageUrl = url;
      next();
    } catch (uploadErr) {
      console.error('Category upload error:', uploadErr);
      return res.status(500).json({ 
        success: false, 
        message: `Upload failed: ${uploadErr.message}` 
      });
    }
  });
};

// --- Poster Upload Middleware ---
const uploadPosters = multer({ storage, fileFilter, limits });
const handlePosterUpload = (req, res, next) => {
  uploadPosters.single('img')(req, res, async function (err) {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    if (!req.file) return next();

    try {
      const url = await uploadToSupabase('poster', req.file);
      req.imageUrl = url;
      next();
    } catch (uploadErr) {
      console.error('Poster upload error:', uploadErr);
      return res.status(500).json({ 
        success: false, 
        message: `Upload failed: ${uploadErr.message}` 
      });
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
      return handleUploadError(err, req, res, next);
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
      console.error('Product upload error:', uploadErr);
      return res.status(500).json({ 
        success: false, 
        message: `Upload failed: ${uploadErr.message}` 
      });
    }
  });
};

module.exports = {
  handleCategoryUpload,
  handlePosterUpload,
  handleProductUpload
};

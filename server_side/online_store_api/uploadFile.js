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
const { createClient } = require('@supabase/supabase-js');

// Setup Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Use memory storage to buffer file for Supabase
const storage = multer.memoryStorage();

// Validate image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png files are allowed!'));
  }
};

// Upload middleware for category, product, posters (5MB limit)
const uploadCategory = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadProduct = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPosters = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Uploads a buffer to Supabase Storage.
 * @param {Buffer} buffer - File buffer
 * @param {string} bucket - Bucket name (e.g., category, products, posters)
 * @param {string} filename - Filename (include timestamp to avoid overwrite)
 * @returns {Promise<string>} - Public image URL
 */
const uploadToSupabase = async (buffer, bucket, filename, mimetype) => {
  const { error } = await supabase.storage.from(bucket).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  // Return public URL
  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(filename);
  return publicUrl.publicUrl;
};

module.exports = {
  uploadCategory,
  uploadProduct,
  uploadPosters,
  uploadToSupabase,
};

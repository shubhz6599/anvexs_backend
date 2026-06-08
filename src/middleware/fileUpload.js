// ============================================
// ANVEXS - File Upload Middleware (Cloudinary)
// Replaces local disk storage - works on Render
// ============================================
import multer from 'multer';
import path from 'path';

// Use memory storage - file goes to Cloudinary, not disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX files are allowed'));
    }
  },
});

export default upload;
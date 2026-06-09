import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer config — stores in /uploads/avatars/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  },
});

export const uploadAvatarMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
}).single('profilePicture');

// POST /api/auth/upload-avatar
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    // Delete old avatar file if it exists and isn't a URL (e.g. OAuth picture)
    const existing = await User.findById(req.user._id);
    if (existing?.profilePicture && existing.profilePicture.startsWith('uploads/')) {
      fs.unlink(existing.profilePicture, () => {}); // fire-and-forget
    }
    const profilePicture = req.file.path.replace(/\\/g, '/'); // normalize Windows paths
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture },
      { new: true }
    );
    logger.info(`Avatar updated for: ${user.email}`);
    res.json({ success: true, message: 'Profile picture updated.', data: { user } });
  } catch (error) { next(error); }
};

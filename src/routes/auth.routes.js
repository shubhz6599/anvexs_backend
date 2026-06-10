import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { register, login, refreshToken, logout, getMe, updateProfile, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { createNewsletter, upload } from '../controllers/newsletter.controller.js';

const router = Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: (req, file, cb) => /image\/(jpeg|png|webp|gif)/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed')) });

router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ min: 2, max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional({ checkFalsy: true }),
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Profile update — supports optional avatar image upload
router.put('/profile', authenticate, avatarUpload.single('profilePicture'), [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name min 2 chars'),
  body('phone').optional({ checkFalsy: true }),
], updateProfile);

router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], forgotPassword);
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('otp').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], resetPassword);
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], changePassword);

router.post('/newsletters', authenticate,
  upload.single('attachment'),
  createNewsletter);

export default router;
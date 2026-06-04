import express from 'express';
import { body } from 'express-validator';
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  getEnquiryById,
  deleteEnquiry,
} from '../controllers/enquiry.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/enquiries - Create enquiry (public)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('service').notEmpty().withMessage('Service is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone'),
    body('budget').optional().trim(),
    body('timeline').optional().trim(),
  ],
  createEnquiry
);

// GET /api/enquiries - Get all enquiries (admin only)
router.get('/', authenticate, authorize('admin'), getEnquiries);

// GET /api/enquiries/:id - Get single enquiry (admin only)
router.get('/:id', authenticate, authorize('admin'), getEnquiryById);

// PUT /api/enquiries/:id/status - Update status (admin only)
router.put(
  '/:id/status',
  authenticate,
  authorize('admin'),
  [
    body('status')
      .isIn(['new', 'contacted', 'qualified', 'closed'])
      .withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('notes').optional().trim(),
  ],
  updateEnquiryStatus
);

// DELETE /api/enquiries/:id - Delete enquiry (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteEnquiry);

export default router;
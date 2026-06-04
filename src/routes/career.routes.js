import express from 'express';
import { body } from 'express-validator';
import {
  getOpenings,
  applyForJob,
  getApplications,
  updateApplicationStatus,
} from '../controllers/career.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/careers/openings - Get job openings (public)
router.get('/openings', getOpenings);

// POST /api/careers/apply - Submit application (public)
router.post(
  '/apply',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('position').notEmpty().withMessage('Position is required'),
    body('phone').optional().isMobilePhone(),
    body('linkedInUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('coverLetter').optional().trim(),
  ],
  applyForJob
);

// GET /api/careers - Get applications (admin only)
router.get('/', authenticate, authorize('admin'), getApplications);

// PUT /api/careers/:id - Update application (admin only)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    body('status')
      .optional()
      .isIn(['applied', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'])
      .withMessage('Invalid status'),
    body('interviewDate').optional().isISO8601(),
  ],
  updateApplicationStatus
);

export default router;
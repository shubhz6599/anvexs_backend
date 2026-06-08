// ============================================
// ANVEXS - Career Routes
// ============================================
import { Router } from 'express';
import { body } from 'express-validator';
import upload from '../middleware/fileUpload.js';
import { getOpenings, applyForJob, getApplications, updateApplicationStatus } from '../controllers/career.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/careers/openings — public
router.get('/openings', getOpenings);

// POST /api/careers/apply — public, accepts multipart/form-data with CV file
router.post(
  '/apply',
  upload.single('cv'),  // field name must be 'cv' in frontend FormData
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('phone').optional({ checkFalsy: true }),
    body('linkedIn').optional({ checkFalsy: true }),
    body('portfolio').optional({ checkFalsy: true }),
  ],
  applyForJob
);

// GET /api/careers — admin only
router.get('/', getApplications);

// PUT /api/careers/:id — admin only
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    body('status').optional().isIn(['applied','reviewed','shortlisted','interview','rejected','hired']),
    body('interviewDate').optional().isISO8601(),
  ],
  updateApplicationStatus
);

export default router;
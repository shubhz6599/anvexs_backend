import express from 'express';
import { subscribeNewsletter } from '../controllers/blog.controller.js';

const router = express.Router();

router.post('/subscribe', [
  body('email').isEmail().withMessage('Valid email required')
], subscribeNewsletter);

export default router;
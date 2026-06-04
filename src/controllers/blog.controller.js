import { validationResult } from 'express-validator';
import NewsletterSubscriber from '../models/newsletter.model.js';
import { logger } from '../config/logger.js';

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Check if already subscribed
    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already subscribed'
      });
    }

    await NewsletterSubscriber.create({
      email,
      subscribedAt: new Date(),
      active: true
    });

    logger.info(`New newsletter subscriber: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Subscribed to newsletter!'
    });
  } catch (error) {
    next(error);
  }
};
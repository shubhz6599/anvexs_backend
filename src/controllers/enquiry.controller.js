import { validationResult } from 'express-validator';
import Enquiry from '../models/enquiry.model.js';
import { sendEnquiryConfirmation } from '../services/email.service.js';
import { logger } from '../config/logger.js';

// POST /api/enquiries - Create new enquiry
export const createEnquiry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, company, service, budget, timeline, message } = req.body;

    // Create enquiry record
    const enquiry = await Enquiry.create({
      name,
      email,
      phone,
      company,
      service,
      budget,
      timeline,
      message,
      ipAddress: req.ip,
      source: 'website',
      status: 'new',
    });

    // Send confirmation email asynchronously (don't block response)
    sendEnquiryConfirmation(enquiry).catch((err) => {
      logger.warn(`Enquiry confirmation email failed: ${err?.message}`);
    });

    logger.info(`New enquiry created: ${email} - Service: ${service}`);

    res.status(201).json({
      success: true,
      message:
        'Your enquiry has been submitted successfully. We will contact you within 24 hours.',
      data: {
        id: enquiry._id,
        name: enquiry.name,
        email: enquiry.email,
        service: enquiry.service,
        createdAt: enquiry.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/enquiries - Get all enquiries (Admin only)
export const getEnquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, service } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (service) filter.service = service;

    const total = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        enquiries,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/enquiries/:id/status - Update enquiry status (Admin only)
export const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status, priority, notes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;

    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!enquiry) {
      return res
        .status(404)
        .json({ success: false, message: 'Enquiry not found.' });
    }

    if (notes) {
      enquiry.notes.push({
        content: notes,
        addedBy: req.user?._id || 'system',
      });
      await enquiry.save();
    }

    logger.info(`Enquiry ${req.params.id} updated: status=${status}`);

    res.json({ success: true, data: { enquiry } });
  } catch (error) {
    next(error);
  }
};

// GET /api/enquiries/:id - Get single enquiry
export const getEnquiryById = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).populate(
      'assignedTo',
      'firstName lastName email'
    );

    if (!enquiry) {
      return res
        .status(404)
        .json({ success: false, message: 'Enquiry not found.' });
    }

    res.json({ success: true, data: { enquiry } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/enquiries/:id - Delete enquiry (Admin only)
export const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);

    if (!enquiry) {
      return res
        .status(404)
        .json({ success: false, message: 'Enquiry not found.' });
    }

    logger.info(`Enquiry ${req.params.id} deleted`);

    res.json({ success: true, message: 'Enquiry deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

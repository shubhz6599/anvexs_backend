import { validationResult } from 'express-validator';
import Career from '../models/career.model.js';
import { sendCareerConfirmation } from '../services/email.service.js';
import { logger } from '../config/logger.js';

// GET /api/careers/openings - Get all job openings
export const getOpenings = async (req, res, next) => {
  try {
    const openings = [
      {
        id: '1',
        title: 'Senior Full-Stack Developer',
        type: 'full_time',
        department: 'Engineering',
        location: 'Remote / Hyderabad',
        experience: '3-6 years',
        skills: ['Angular', 'Node.js', 'MongoDB', 'AWS'],
        description:
          'Lead architecture and development of high-performance web platforms.',
      },
      {
        id: '2',
        title: 'AI/ML Engineer',
        type: 'full_time',
        department: 'Engineering',
        location: 'Remote',
        experience: '2-5 years',
        skills: ['Python', 'TensorFlow', 'LangChain', 'FastAPI'],
        description:
          'Build production AI systems and LLM-powered applications.',
      },
      {
        id: '3',
        title: 'UI/UX Designer',
        type: 'full_time',
        department: 'Design',
        location: 'Hyderabad',
        experience: '2-4 years',
        skills: ['Figma', 'Adobe XD', 'Motion Design'],
        description:
          'Design delightful user experiences for enterprise products.',
      },
      {
        id: '4',
        title: 'React Native Developer',
        type: 'full_time',
        department: 'Engineering',
        location: 'Remote',
        experience: '2-4 years',
        skills: ['React Native', 'TypeScript', 'Firebase'],
        description: 'Build cross-platform mobile experiences.',
      },
      {
        id: '5',
        title: 'DevOps / Cloud Engineer',
        type: 'full_time',
        department: 'Engineering',
        location: 'Remote',
        experience: '3-6 years',
        skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'],
        description: 'Architect and maintain scalable cloud infrastructure.',
      },
      {
        id: '6',
        title: 'Software Development Intern',
        type: 'internship',
        department: 'Engineering',
        location: 'Remote',
        experience: '0 years',
        skills: ['Any Stack', 'Eagerness to Learn'],
        description: '3-month paid internship to level up your skills.',
      },
    ];

    res.json({ success: true, data: { openings } });
  } catch (error) {
    next(error);
  }
};

// POST /api/careers/apply - Submit job application
export const applyForJob = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      position,
      experience,
      skills,
      linkedInUrl,
      portfolioUrl,
      coverLetter,
    } = req.body;

    // Check for duplicate application within 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existing = await Career.findOne({
      email,
      jobTitle: position,
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          'You have already applied for this position in the last 30 days. Please try again later.',
      });
    }

    // Create application record
    const application = await Career.create({
      applicantName: name,
      email,
      phone,
      jobTitle: position,
      experience: experience || 0,
      skills: skills || [],
      linkedInUrl,
      portfolioUrl,
      coverLetter,
      status: 'applied',
    });

    // Send confirmation email asynchronously
    sendCareerConfirmation(application).catch((err) => {
      logger.warn(`Career confirmation email failed: ${err?.message}`);
    });

    logger.info(
      `New career application: ${email} for ${position} | ID: ${application._id}`
    );

    res.status(201).json({
      success: true,
      message:
        'Application submitted! We will review and get back to you within 5 business days.',
      data: {
        id: application._id,
        jobTitle: application.jobTitle,
        applicantName: application.applicantName,
        status: application.status,
        appliedAt: application.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/careers - Get all applications (Admin only)
export const getApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, jobTitle } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (jobTitle) filter.jobTitle = jobTitle;

    const total = await Career.countDocuments(filter);
    const applications = await Career.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
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

// PUT /api/careers/:id - Update application status (Admin only)
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, interviewDate, notes } = req.body;
    const update = { status };
    if (interviewDate) update.interviewDate = new Date(interviewDate);

    const application = await Career.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: 'Application not found.' });
    }

    logger.info(
      `Career application ${req.params.id} updated to status: ${status}`
    );

    res.json({ success: true, data: { application } });
  } catch (error) {
    next(error);
  }
};
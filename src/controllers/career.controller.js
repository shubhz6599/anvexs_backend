import { validationResult } from 'express-validator';
import Career from '../models/career.model.js';
import { sendCareerConfirmation } from '../services/email.service.js';
import { uploadCV } from '../services/cloudinary.service.js';
import { logger } from '../config/logger.js';

export const getOpenings = async (req, res, next) => {
  try {
    const openings = [
      { id: '1', title: 'Senior Full-Stack Developer', type: 'full_time', department: 'Engineering', location: 'Remote / Ahilyanagar', experience: '3-6 years', skills: ['Angular', 'Node.js', 'MongoDB', 'AWS'], description: 'Lead architecture and development of high-performance web platforms.' },
      { id: '2', title: 'AI/ML Engineer', type: 'full_time', department: 'Engineering', location: 'Remote', experience: '2-5 years', skills: ['Python', 'TensorFlow', 'LangChain', 'FastAPI'], description: 'Build production AI systems and LLM-powered applications.' },
      { id: '3', title: 'UI/UX Designer', type: 'full_time', department: 'Design', location: 'Ahilyanagar', experience: '2-4 years', skills: ['Figma', 'Adobe XD', 'Motion Design'], description: 'Design delightful user experiences for enterprise products.' },
      { id: '4', title: 'React Native Developer', type: 'full_time', department: 'Engineering', location: 'Remote', experience: '2-4 years', skills: ['React Native', 'TypeScript', 'Firebase'], description: 'Build cross-platform mobile experiences.' },
      { id: '5', title: 'DevOps / Cloud Engineer', type: 'full_time', department: 'Engineering', location: 'Remote', experience: '3-6 years', skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'], description: 'Architect and maintain scalable cloud infrastructure.' },
      { id: '6', title: 'Software Development Intern', type: 'internship', department: 'Engineering', location: 'Remote', experience: '0 years', skills: ['Any Stack', 'Eagerness to Learn'], description: '3-month internship to level up your skills.' },
    ];
    res.json({ success: true, data: { openings } });
  } catch (error) { next(error); }
};

export const applyForJob = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, phone, position, experience, linkedIn, portfolio, message } = req.body;
    const cvFile = req.file;

    // Required field checks
    if (!name || !email || !position) {
      return res.status(400).json({ success: false, message: 'Name, email, and position are required.' });
    }
    if (!cvFile) {
      return res.status(400).json({ success: false, message: 'CV file is required. Upload a PDF, DOC, or DOCX.' });
    }

    // Duplicate application check (same email + position within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existing = await Career.findOne({
      email:    email.toLowerCase().trim(),
      jobTitle: position,
      createdAt: { $gte: thirtyDaysAgo },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already applied for this position recently. Try again in 30 days.',
      });
    }

    // Upload CV to Cloudinary — fail hard if it doesn't work
    let cvPath, cvPublicId;
    try {
      const uploaded = await uploadCV(cvFile.buffer, cvFile.originalname, name);
      cvPath     = uploaded.url;
      cvPublicId = uploaded.publicId;
    } catch (uploadErr) {
      logger.error(`CV upload error: ${uploadErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'CV upload failed. Please try again. ' + uploadErr.message,
      });
    }

    // Save application
    const application = await Career.create({
      applicantName: name,
      email:         email.toLowerCase().trim(),
      phone:         phone    || undefined,
      jobTitle:      position,
      jobType:       'full_time',
      experience:    experience !== undefined ? Number(experience) : 0,
      linkedInUrl:   linkedIn  || undefined,
      portfolioUrl:  portfolio || undefined,
      coverLetter:   message   || undefined,
      cvPath,
      cvPublicId,
      status: 'applied',
    });

    // Send confirmation email (non-blocking)
    sendCareerConfirmation(application).catch(err =>
      logger.warn(`Career email failed: ${err.message}`)
    );

    logger.info(`New application: ${email} → ${position} | CV: ${cvPath}`);

    res.status(201).json({
      success: true,
      message: "Application submitted! We'll review within 5 business days.",
      data: { id: application._id, jobTitle: application.jobTitle, status: application.status },
    });
  } catch (error) { next(error); }
};

export const getApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, jobTitle } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (jobTitle) filter.jobTitle = jobTitle;

    const total        = await Career.countDocuments(filter);
    const applications = await Career.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) { next(error); }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, interviewDate } = req.body;
    const update = { status };
    if (interviewDate) update.interviewDate = new Date(interviewDate);

    const application = await Career.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    logger.info(`Application ${req.params.id} → ${status}`);
    res.json({ success: true, data: { application } });
  } catch (error) { next(error); }
};
// ============================================
// ANVEXS - Career Application Model
// ============================================
import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true, trim: true },
    jobType: {
      type: String,
      enum: ['full_time', 'part_time', 'internship', 'contract', 'freelance'],
      required: true,
    },
    department: {
      type: String,
      enum: ['engineering', 'design', 'marketing', 'sales', 'hr', 'finance', 'operations'],
    },
    applicantName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    linkedInUrl: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    resumeUrl: { type: String, trim: true }, // S3/cloud storage URL
    experience: { type: Number, min: 0, max: 50 }, // years
    currentCTC: { type: String },
    expectedCTC: { type: String },
    noticePeriod: { type: String },
    skills: [{ type: String, trim: true }],
    coverLetter: { type: String, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
      default: 'applied',
    },
    interviewDate: { type: Date, default: null },
    referredBy: { type: String },
  },
  { timestamps: true }
);

careerSchema.index({ email: 1 });
careerSchema.index({ jobTitle: 1, status: 1 });

const Career = mongoose.model('Career', careerSchema);
export default Career;
import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema(
  {
    jobTitle:     { type: String, required: true, trim: true },
    jobType:      { type: String, enum: ['full_time', 'part_time', 'internship', 'contract'], default: 'full_time' },
    department:   { type: String, trim: true },
    applicantName:{ type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    phone:        { type: String, trim: true },
    experience:   { type: Number, default: 0 },
    skills:       [String],
    linkedInUrl:  { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    coverLetter:  { type: String, trim: true },

    // CV stored as Cloudinary HTTPS URL (viewable directly in browser)
    cvPath:       { type: String },   // full https://res.cloudinary.com/... URL
    cvPublicId:   { type: String },   // cloudinary public_id for deletion

    status: {
      type: String,
      enum: ['applied', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'],
      default: 'applied',
    },
    interviewDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for duplicate check
careerSchema.index({ email: 1, jobTitle: 1, createdAt: -1 });

export default mongoose.model('Career', careerSchema);
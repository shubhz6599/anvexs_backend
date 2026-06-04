// ============================================
// ANVEXS - Enquiry Model
// ============================================
import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 15 },
    company: { type: String, trim: true, maxlength: 100 },
    service: {
      type: String,
      required: true,
      enum: [
        'web_development',
        'app_development',
        'game_development',
        'ai_tools_integration',
        'college_projects',
        'digital_marketing',
        'internship',
        'other',
      ],
    },
    budget: {
      type: String,
      enum: ['under_50k', '50k_2l', '2l_5l', '5l_plus', 'not_disclosed'],
      default: 'not_disclosed',
    },
    timeline: { type: String, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in_progress', 'closed', 'spam'],
      default: 'new',
    },
    priority: {
      type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: [
      {
        content: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    ipAddress: { type: String },
    source: { type: String, enum: ['website', 'referral', 'social', 'direct'], default: 'website' },
  },
  { timestamps: true }
);

enquirySchema.index({ email: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ service: 1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
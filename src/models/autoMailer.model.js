// models/newsletter.model.js

import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachmentUrl: String,
    attachmentType: String,

    status: {
      type: String,
      enum: ['pending', 'sent'],
      default: 'pending',
    },

    scheduledFor: {
      type: Date,
      required: true,
    },

    sentAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Newsletter', newsletterSchema);
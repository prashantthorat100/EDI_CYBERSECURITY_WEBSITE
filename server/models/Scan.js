const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['url', 'pdf', 'docx'],
      required: true,
    },
    target: {
      type: String, // URL string or filename
      required: true,
    },
    originalName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    pages: {
      type: Number,
      default: null,
    },
    threatLevel: {
      type: String,
      enum: ['safe', 'warning', 'suspicious', 'malicious'],
      required: true,
    },
    threatScore: {
      type: Number, // 0–100
      required: true,
    },
    confidenceScore: {
      type: Number, // 0–100
      default: null,
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'pending'],
      default: 'completed',
    },
    detectedFeatures: [String],
    recommendation: {
      type: String,
      default: '',
    },
    aiExplanation: {
      type: String,
      default: '',
    },
    macrosFound: { type: Boolean, default: false },
    hiddenObjects: { type: Boolean, default: false },
    embeddedLinks: [String],
    scanDuration: {
      type: Number, // ms
      default: 0,
    },
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    screenshot: {
      type: String, // Base64 image data
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scan', scanSchema);

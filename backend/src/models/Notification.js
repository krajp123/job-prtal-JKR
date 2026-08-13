const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', index: true },

    type: {
      type: String,
      enum: ['application_status', 'message', 'job_alert', 'system'],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    // Optional pointer to the thing this notification is about
    // (an Application id, a Recruiter id for messages, a Job id, etc.)
    relatedId: { type: mongoose.Schema.Types.ObjectId },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

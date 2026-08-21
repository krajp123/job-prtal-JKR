const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    role: { type: String, trim: true },
    category: { type: String, trim: true },
    industry: { type: String, trim: true },
    description: { type: String, required: true },
    // Rich HTML per section (e.g. "About the company", "Roles & responsibilities"),
    // written by PostJob.jsx's RichTextField editor. `description` above stays as a
    // plain-text flattened copy (used for search/matching in job.controller.js);
    // this is the formatted source of truth used for rendering.
    descriptionSections: { type: mongoose.Schema.Types.Mixed, default: undefined },
    location: { type: String },
    salary: { type: String },
    skillsRequired: [{ type: String }],
    experienceLevel: { type: String },

    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },
    adminClosed: { type: Boolean, default: false },
    // 'open'/'closed' are used by list/closeJob; 'active'/'draft' are sent by
    // PostJob.jsx's publish/save-draft flow — all four are accepted so neither
    // path throws a validation error.
    status: { type: String, enum: ['open', 'closed', 'active', 'draft'], default: 'open' },
    statusBeforeModeration: { type: String, enum: ['open', 'active', 'closed', 'draft'] },
    moderationStatus: { type: String, enum: ['clear', 'flagged', 'reviewed'], default: 'clear' },
    moderationMatches: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
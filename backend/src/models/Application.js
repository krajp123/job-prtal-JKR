const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },

    status: {
      type: String,
      enum: ['applied', 'viewed', 'shortlisted', 'interview_scheduled', 'offered', 'accepted', 'rejected', 'hired'],
      default: 'applied',
    },

    referredByUniqueId: { type: String }, // if this candidate was referred (Section 5.5)

    // Timeline tracking
    appliedAt: { type: Date, default: Date.now },
    viewedAt: { type: Date }, // when recruiter viewed the application
    resumeViewedAt: { type: Date }, // when recruiter viewed the resume
    interviewScheduledAt: { type: Date }, // when interview was scheduled
    offeredAt: { type: Date }, // when offer was made
    acceptedAt: { type: Date }, // when candidate accepted offer
    
    // Interview details
    interviewDate: { type: Date }, // scheduled interview date
    interviewTime: { type: String }, // scheduled interview time (HH:MM format)

    // Activity tracking
    viewsCount: { type: Number, default: 0 }, // total views by recruiters
    applicationsViewed: { type: Number, default: 0 }, // total applications viewed by this recruiter
    
    // Matching criteria
    matchedSkills: [{ type: String }], // skills that matched job requirements
    skillsMatch: { type: Number, default: 0 }, // percentage of skills matched (0-100)
    experienceMatch: { type: Boolean, default: false }, // if candidate experience matches
    locationMatch: { type: Boolean, default: false }, // if candidate location matches
    
    // Additional fields
    highlightedAt: { type: Date }, // when application was highlighted
    highlighted: { type: Boolean, default: false }, // if application is highlighted
    
    notes: { type: String }, // internal notes from recruiter
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);

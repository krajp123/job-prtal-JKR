const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    uniqueId: { type: String, required: true, unique: true, index: true }, // e.g. JS-2026-000123
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true }, // uniqueId is emailed here
    phone: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    workStatus: { type: String, enum: ['fresher', 'experienced'], default: 'fresher' },
    experienceCertificateUrl: { type: String }, // Cloudflare R2 link — only set when workStatus is 'experienced'

    profile: {
      headline: { type: String },
      about: { type: String },
      location: { type: String },
      phone: { type: String },
      workPreferences: { type: String },
      availability: { type: String },
      skills: [{ type: String }],
      preferredRoles: [{ type: String }],
      preferredLocations: [{ type: String }],
      preferredSkills: [{ type: String }],
      preferredMinSalary: { type: String },
      preferredMaxSalary: { type: String },
      preferredNoticePeriod: { type: String },
      alertFrequency: { type: String, enum: ['instant', 'daily', 'weekly', 'off'], default: 'daily' },
      experience: [
        {
          company: String,
          role: String,
          from: String,
          to: String,
          description: String,
          current: Boolean,
          salary: String,
          designation: String,
          employmentType: String,
          location: String,
          department: String,
          stipend: String,
          totalExpYears: Number,
          totalExpMonths: Number,
          joiningYear: String,
          joiningMonth: String,
          workingFromYear: String,
          workingFromMonth: String,
          workingTillYear: String,
          workingTillMonth: String,
          noticePeriod: String,
          internshipDescription: String,
          currentSalary: String,
        },
      ],
      education: [
        {
          educationLevel: String,
          institution: String,
          degree: String,
          year: Number,
          courseName: String,
          startYear: String,
          endYear: String,
          courseType: String,
          gradingSystem: String,
          specialization: String,
          doctorateType: String,
          researchStartYear: String,
          researchStartMonth: String,
          researchEndYear: String,
          researchEndMonth: String,
          thesisTitle: String,
          marks: String,
          board: String,
          schoolName: String,
          passingYear: String,
          schoolMedium: String,
          stream: String,
          startMonth: String,
          endMonth: String,
        },
      ],
      certifications: [
        {
          name: String,
          completionId: String,
          credentialUrl: String,
          startMonth: String,
          startYear: String,
          expiryMonth: String,
          expiryYear: String,
          noExpiry: Boolean,
        },
      ],
      languages: [{ type: String }],
      projects: [
        {
          title: String,
          client: String,
          status: String,
          workedFromMonth: String,
          workedFromYear: String,
          workedTillMonth: String,
          workedTillYear: String,
          location: String,
          site: String,
          teamSize: String,
          role: String,
          roleDescription: String,
          skills: [{ type: String }],
        },
      ],
      portfolio: [
        {
          title: String,
          description: String,
          url: String,
          thumbnail: String,
        },
      ],
      resumeUrl: { type: String }, // Cloudflare R2 link
      resumeFilename: { type: String }, // original candidate resume filename
      profilePictureUrl: { type: String }, // Cloudflare R2 link — shown as DP across the app
    },

    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],

    visibility: { type: String, enum: ['public', 'private', 'applied', 'hidden'], default: 'public' },
    searchable: { type: Boolean, default: true },
    hiddenCompanies: [{ type: String }],
    twoFactorEnabled: { type: Boolean, default: false },
    notificationPreferences: {
      jobRecommendations: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      recruiterMessages: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      smsReminders: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },

    socialLinks: {
      github: { type: String },
      linkedin: { type: String },
      website: { type: String },
    },

    gamification: {
      badges: [
        {
          key: { type: String }, // e.g. 'profile_complete', 'first_application'
          label: { type: String },
          unlockedAt: { type: Date, default: Date.now },
        },
      ],
      loginStreak: {
        count: { type: Number, default: 0 },
        lastLoginDate: { type: Date },
      },
      applicationStreak: {
        count: { type: Number, default: 0 },
        weekStart: { type: Date },
      },
    },

    hiredBadge: {
      isHired: { type: Boolean, default: false },
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      confirmedAt: { type: Date },
    },

    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    registeredAt: { type: Date, default: Date.now },
    renewalDueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', candidateSchema);
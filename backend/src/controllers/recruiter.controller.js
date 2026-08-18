const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const Recruiter = require('../models/Recruiter');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const Message = require('../models/Message');
const Wallet = require('../models/Wallet');
const OfferLetter = require('../models/OfferLetter');
const Payment = require('../models/Payment');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { isValidEmail, isValidPhone, isStrongEnoughPassword } = require('../utils/validators');
const walletController = require('./wallet.controller');

function sanitizeFileName(name = '') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferOriginalNameFromResumeUrl(resumeUrl = '') {
  try {
    const rawName = decodeURIComponent(resumeUrl.split('/').pop()?.split('?')[0] || '');
    const match = rawName.match(/^[a-f0-9]{24}-\d+-(.+)$/i);
    return match?.[1] || rawName;
  } catch {
    return 'resume.pdf';
  }
}

function resolveResumeFileName(candidate) {
  const resumeUrl = candidate?.profile?.resumeUrl || '';
  let fileName = sanitizeFileName(candidate?.profile?.resumeFilename || '');

  if (!fileName) {
    fileName = sanitizeFileName(inferOriginalNameFromResumeUrl(resumeUrl));
  }

  if (!fileName) {
    fileName = 'resume.pdf';
  }

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName = `${fileName}.pdf`;
  }

  return fileName;
}

function setDownloadHeaders(res, fileName, contentType = 'application/pdf') {
  const safeFileName = sanitizeFileName(fileName) || 'resume.pdf';
  const encodedName = encodeURIComponent(safeFileName)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Resume-Filename', safeFileName);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedName}`
  );
}

function parseSalaryRange(rawSalary) {
  if (!rawSalary) return null;

  if (typeof rawSalary === 'object' && rawSalary !== null && !Array.isArray(rawSalary)) {
    const min = Number(rawSalary.min ?? rawSalary.minimum ?? 0);
    const max = Number(rawSalary.max ?? rawSalary.maximum ?? 0);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      return {
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : min,
        currency: rawSalary.currency || 'INR',
      };
    }
  }

  if (typeof rawSalary === 'string') {
    const cleaned = rawSalary.replace(/[^0-9\- toLlkK,\.]/g, ' ').trim();
    const matches = cleaned.match(/\d+(?:[.,]\d+)?/g) || [];
    if (!matches.length) return null;

    const numbers = matches.map((value) => Number(value.replace(/,/g, '')));
    const minimum = numbers[0] || 0;
    const maximum = numbers[1] || minimum;

    return {
      min: minimum * 100000,
      max: maximum * 100000,
      currency: 'INR',
    };
  }

  return null;
}

function normalizeRecruiterJob(job, applicantsCount) {
  const location = job.location || 'Remote';
  const experience = job.experienceLevel || 'Not disclosed';
  const workMode = job.workMode || (location.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid');

  return {
    _id: job._id,
    title: job.title,
    department: job.department || 'Hiring',
    location,
    workMode,
    experience,
    salary: parseSalaryRange(job.salary),
    postedDate: job.createdAt || job.postedDate,
    applicants: applicantsCount || 0,
    description: job.description || '',
    descriptionSections: job.descriptionSections || null,
    skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired.filter(Boolean) : [],
    status: job.status || 'open',
    createdAt: job.createdAt || job.postedDate,
  };
}

// GET /api/recruiter/me
exports.getMyProfile = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.user.id).select('-passwordHash');
    
    console.log('🔍 getMyProfile - languages from DB:', {
      languages: recruiter?.languages,
      isArray: Array.isArray(recruiter?.languages),
      length: recruiter?.languages?.length,
    });
    
    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/:recruiterId/public-profile
exports.getPublicProfile = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.recruiterId).select('-passwordHash');

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    const [jobs, totalApplicationsReceived, totalHires, recentApplicationEvents, recentJobEvents, recentResumeDownloads] = await Promise.all([
      Job.find({ postedBy: recruiter._id, status: { $in: ['open', 'active'] } })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      Application.countDocuments({ recruiter: recruiter._id }),
      Application.countDocuments({ recruiter: recruiter._id, status: 'hired' }),
      Application.find({ recruiter: recruiter._id })
        .sort({ updatedAt: -1 })
        .limit(20)
        .populate('job', 'title')
        .populate('candidate', 'name')
        .lean(),
      Job.find({ postedBy: recruiter._id })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select('title status adminClosed updatedAt createdAt')
        .lean(),
      Payment.find({ userType: 'recruiter', userId: recruiter._id, purpose: 'resume_download', status: 'success' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('relatedResumeDownload.candidate', 'name')
        .lean(),
    ]);

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicants = await Application.countDocuments({ job: job._id });
        return normalizeRecruiterJob(job, applicants);
      })
    );

    const activityEntries = [];
    let activityId = 0; // Counter for unique activity IDs
    const recruiterName = recruiter.fullName || recruiter.companyName || 'Recruiter';

    recentJobEvents.forEach((job) => {
      const createdAt = job.createdAt ? new Date(job.createdAt) : null;
      const updatedAt = job.updatedAt ? new Date(job.updatedAt) : null;
      const hasBeenUpdated = createdAt && updatedAt && updatedAt.getTime() > createdAt.getTime();

      if (job.status === 'closed' || job.adminClosed) {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'job',
          entityId: job._id.toString(),
          text: `${recruiterName} closed the hiring process for the position of ${job.title}.`,
          date: job.updatedAt || job.createdAt,
        });
      } else if (job.createdAt && !hasBeenUpdated) {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'job',
          entityId: job._id.toString(),
          text: `${recruiterName} posted a new job opportunity for the position of ${job.title}.`,
          date: job.createdAt,
        });
      } else if (hasBeenUpdated) {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'job',
          entityId: job._id.toString(),
          text: `${recruiterName} re-opened the hiring process for the position of ${job.title}.`,
          date: job.updatedAt || job.createdAt,
        });
      }
    });

    recentApplicationEvents.forEach((application) => {
      const candidateName = application.candidate?.name || 'Candidate';
      const jobTitle = application.job?.title || 'a role';

      // Use else-if to ensure only ONE activity per application
      if (application.status === 'hired') {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'hire',
          entityType: 'application',
          entityId: application._id.toString(),
          text: `${recruiterName} extended an offer to ${candidateName} for the position of ${jobTitle}.`,
          date: application.updatedAt || application.createdAt,
        });
      } else if (application.status === 'shortlisted') {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'application',
          entityId: application._id.toString(),
          text: `${recruiterName} just shortlisted candidate ${candidateName} for the position of ${jobTitle}.`,
          date: application.updatedAt || application.createdAt,
        });
      } else if (application.status === 'interview_scheduled') {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'application',
          entityId: application._id.toString(),
          text: `${recruiterName} scheduled an interview with ${candidateName} for the position of ${jobTitle}.`,
          date: application.updatedAt || application.createdAt,
        });
      } else if (application.status === 'rejected') {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'application',
          entityId: application._id.toString(),
          text: `${recruiterName} declined the application of ${candidateName} for the position of ${jobTitle}.`,
          date: application.updatedAt || application.createdAt,
        });
      } else if (application.status === 'viewed') {
        activityEntries.push({
          id: `activity-${++activityId}`,
          type: 'job',
          entityType: 'application',
          entityId: application._id.toString(),
          text: `${recruiterName} reviewed the application profile of ${candidateName} for the position of ${jobTitle}.`,
          date: application.updatedAt || application.createdAt,
        });
      }
    });

    recentResumeDownloads.forEach((payment) => {
      const candidateName = payment.relatedResumeDownload?.candidate?.name || 'Candidate';
      activityEntries.push({
        id: `activity-${++activityId}`,
        type: 'job',
        entityType: 'resume',
        entityId: payment._id.toString(),
        text: `${recruiterName} downloaded and reviewed the resume of candidate ${candidateName}.`,
        date: payment.createdAt,
      });
    });

    const mergedActivity = [...activityEntries]
      .filter((entry) => entry?.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 🔧 SMART DEDUPLICATION: Keep only MOST RECENT activity per ENTITY
    // Key: entityType + entityId (e.g., "job-123", "application-456")
    // This ensures:
    // - Only 1 activity per job (the most recent update)
    // - Only 1 activity per application (the most recent status change)
    // - But different jobs can each have their own activity
    
    const entityActivityMap = new Map();
    
    mergedActivity.forEach((entry) => {
      // Create unique key: "entityType-entityId" 
      // Examples: "job-507f1f77bcf86cd799439011", "application-507f1f77bcf86cd799439012"
      const entityKey = entry.entityType && entry.entityId 
        ? `${entry.entityType}-${entry.entityId}` 
        : entry.text; // Fallback to text if no entity ID
      
      // Only keep if we haven't seen this entity before
      // Since array is sorted DESC by date, first occurrence is MOST RECENT
      if (!entityActivityMap.has(entityKey)) {
        entityActivityMap.set(entityKey, entry);
      }
    });

    // Convert map to array and take top 5 most recent
    const activity = Array.from(entityActivityMap.values()).slice(0, 5);

    const totalJobsPosted = await Job.countDocuments({ postedBy: recruiter._id });
    const responseRate = totalApplicationsReceived ? Math.min(99, Math.max(20, Math.round((totalHires / totalApplicationsReceived) * 100))) : 0;

    const publicProfile = {
      _id: recruiter._id,
      name: recruiter.fullName || recruiter.companyName || 'Recruiter',
      title: recruiter.designation || 'Recruitment Lead',
      email: recruiter.email || '',
      phone: recruiter.phone || '',
      companyName: recruiter.companyName || '',
      companyWebsite: recruiter.companyWebsite || '',
      companyEmail: recruiter.companyEmail || '',
      companyGst: recruiter.companyGst || '',
      companyCin: recruiter.companyCin || '',
      companyDescription: recruiter.companyDetails || recruiter.bio || '',
      companyLogoUrl: recruiter.companyLogoUrl || '',
      profilePictureUrl: recruiter.profilePictureUrl || '',
      location: recruiter.location || 'Remote / India',
      linkedinUrl: recruiter.linkedinUrl || '',
      bio: recruiter.bio || recruiter.companyDetails || '',
      experienceYears: recruiter.experienceYears || 0,
      expertiseTags: recruiter.expertiseTags || [],
      experienceTimeline: recruiter.experienceTimeline || [],
      totalJobsPosted,
      totalApplicationsReceived,
      totalHires,
      responseRate,
      avgResponseTime: '18h',
      joinedDate: recruiter.createdAt || recruiter.registeredAt || new Date().toISOString(),
      languages: recruiter.languages || [],
      hiringLocations: recruiter.location ? [recruiter.location] : ['Remote'],
      rating: 4.8,
      reviews: 24,
      verified: recruiter.accountStatus === 'active',
      jobs: jobsWithCounts,
      activity,
    };

    res.json(publicProfile);
  } catch (err) {
    console.error('❌ Error in getPublicProfile:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/dashboard/overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [openJobs, activeApplications, candidatesScreened, shortlisted, interviewsScheduled, offersSent, newHires, aiMatchesToday] = await Promise.all([
      Job.countDocuments({ postedBy: recruiterId, status: 'open' }),
      Application.countDocuments({ recruiter: recruiterId }),
      Application.countDocuments({
        recruiter: recruiterId,
        $or: [
          { viewedAt: { $exists: true, $ne: null } },
          { resumeViewedAt: { $exists: true, $ne: null } },
        ],
      }),
      Application.countDocuments({ recruiter: recruiterId, status: 'shortlisted' }),
      Application.countDocuments({ recruiter: recruiterId, status: 'interview_scheduled' }),
      Application.countDocuments({ recruiter: recruiterId, status: 'offered' }),
      Application.countDocuments({ recruiter: recruiterId, status: 'hired' }),
      Application.countDocuments({
        recruiter: recruiterId,
        skillsMatch: { $gte: 50 },
        createdAt: { $gte: startOfToday },
      }),
    ]);

    res.json({
      openJobs,
      activeApplications,
      candidatesScreened,
      shortlisted,
      interviewsScheduled,
      offersSent,
      newHires,
      aiMatchesToday,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/recruiter/me
exports.updateMyProfile = async (req, res) => {
  try {
    const {
      fullName,
      designation,
      email,
      phone,
      companyName,
      companyWebsite,
      companyEmail,
      companyGst,
      companyCin,
      companyDetails,
      companyLogoUrl,
      profilePictureUrl,
      location,
      bio,
      experienceYears,
      expertiseTags,
      languages,
      experienceTimeline,
    } = req.body;

    console.log('🔍 Backend received in updateMyProfile:', {
      languages,
      isArray: Array.isArray(languages),
      length: languages?.length,
    });



    const currentRecruiter = await Recruiter.findById(req.user.id).select('email phone');
    if (!currentRecruiter) {
      return res.status(404).json({ error: 'Recruiter account not found' });
    }

    if (fullName !== undefined && typeof fullName !== 'string') {
      return res.status(400).json({ error: 'Invalid full name' });
    }
    if (designation !== undefined && typeof designation !== 'string') {
      return res.status(400).json({ error: 'Invalid designation' });
    }
    if (companyWebsite !== undefined && typeof companyWebsite !== 'string') {
      return res.status(400).json({ error: 'Invalid company website' });
    }
    if (companyEmail !== undefined && typeof companyEmail !== 'string') {
      return res.status(400).json({ error: 'Invalid company email' });
    }
    if (companyGst !== undefined && typeof companyGst !== 'string') {
      return res.status(400).json({ error: 'Invalid GST number' });
    }
    if (companyCin !== undefined && typeof companyCin !== 'string') {
      return res.status(400).json({ error: 'Invalid CIN number' });
    }
    if (profilePictureUrl !== undefined && typeof profilePictureUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid profile picture URL' });
    }
    if (location !== undefined && typeof location !== 'string') {
      return res.status(400).json({ error: 'Invalid location' });
    }
    if (bio !== undefined && typeof bio !== 'string') {
      return res.status(400).json({ error: 'Invalid bio' });
    }
    if (experienceYears !== undefined) {
      const years = Number(experienceYears);
      if (!Number.isFinite(years) || years < 0) {
        return res.status(400).json({ error: 'Invalid years of experience' });
      }
    }
    if (expertiseTags !== undefined && !Array.isArray(expertiseTags)) {
      return res.status(400).json({ error: 'Expertise tags must be an array' });
    }
    if (languages !== undefined && !Array.isArray(languages)) {
      return res.status(400).json({ error: 'Languages must be an array' });
    }
    if (experienceTimeline !== undefined && !Array.isArray(experienceTimeline)) {
      return res.status(400).json({ error: 'Experience timeline must be an array' });
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      const existingEmail = await Recruiter.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.user.id },
      });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already in use' });
      }
    }

    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      const existingPhone = await Recruiter.findOne({
        phone,
        _id: { $ne: req.user.id },
      });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number is already in use' });
      }
    }

    const update = {};
    if (fullName !== undefined) update.fullName = fullName.trim();
    if (designation !== undefined) update.designation = designation.trim();
    if (email !== undefined) update.email = email.toLowerCase();
    if (phone !== undefined) update.phone = phone;
    if (companyName !== undefined) update.companyName = companyName;
    if (companyWebsite !== undefined) update.companyWebsite = companyWebsite;
    if (companyEmail !== undefined) update.companyEmail = companyEmail;
    if (companyGst !== undefined) update.companyGst = companyGst;
    if (companyCin !== undefined) update.companyCin = companyCin;
    if (companyDetails !== undefined) update.companyDetails = companyDetails;
    if (companyLogoUrl !== undefined) update.companyLogoUrl = companyLogoUrl;
    if (profilePictureUrl !== undefined) update.profilePictureUrl = profilePictureUrl || '';
    if (location !== undefined) update.location = location.trim();
    if (bio !== undefined) update.bio = bio.trim();
    if (experienceYears !== undefined) update.experienceYears = Number(experienceYears);
    if (expertiseTags !== undefined) {
      update.expertiseTags = expertiseTags
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }
    if (languages !== undefined) {
      const processedLanguages = languages
        .map((lang) => String(lang).trim())
        .filter(Boolean);
      update.languages = processedLanguages;
      console.log('💾 Backend update object has languages:', {
        input: languages,
        processed: processedLanguages,
        count: processedLanguages.length,
      });
    }
    if (experienceTimeline !== undefined) {
      update.experienceTimeline = experienceTimeline.map((exp) => ({
        company: String(exp?.company || '').trim(),
        role: String(exp?.role || '').trim(),
        location: String(exp?.location || '').trim(),
        startDate: String(exp?.startDate || '').trim(),
        endDate: String(exp?.endDate || '').trim(),
        current: Boolean(exp?.current),
        duration: String(exp?.duration || '').trim(),
        achievements: Array.isArray(exp?.achievements)
          ? exp.achievements.map((item) => String(item).trim()).filter(Boolean)
          : [],
      })).filter((exp) => exp.company || exp.role || exp.duration || exp.achievements.length);
    }

    const recruiter = await Recruiter.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select('-passwordHash');
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    console.log('✅ After update, languages:', recruiter.languages);
    res.json(recruiter);
  } catch (err) {
    console.error('❌ Error in updateMyProfile:', err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/recruiter/me/settings/:section
exports.updateMySettings = async (req, res) => {
  try {
    const section = req.params.section;

    if (section === 'deactivate') {
      await Job.updateMany({ postedBy: req.user.id, status: 'open' }, { status: 'closed' });
      await Recruiter.findByIdAndUpdate(req.user.id, { accountStatus: 'suspended' });
      return res.json({ message: 'Account deactivated' });
    }

    if (section === 'delete') {
      const applications = await Application.find({ recruiter: req.user.id }).select('_id').lean();
      const applicationIds = applications.map((application) => application._id);

      await Promise.all([
        OfferLetter.deleteMany({ application: { $in: applicationIds } }),
        Application.deleteMany({ recruiter: req.user.id }),
        Job.deleteMany({ postedBy: req.user.id }),
        Message.deleteMany({ recruiter: req.user.id }),
        Wallet.deleteMany({ recruiter: req.user.id }),
        Payment.deleteMany({ userType: 'recruiter', userId: req.user.id }),
      ]);

      await Recruiter.deleteOne({ _id: req.user.id });
      return res.json({ message: 'Account deleted' });
    }

    return res.status(400).json({ error: 'Invalid settings section' });
  } catch (err) {
    console.error('Recruiter settings update failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/me/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (!isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({
        error:
          'New password must be at least 8 characters long and include at least three of: uppercase letters, lowercase letters, numbers, and special characters.',
      });
    }

    const recruiter = await Recruiter.findById(req.user.id).select('passwordHash');
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter account not found' });
    }

    const isMatch = await comparePassword(currentPassword, recruiter.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is the same as current password
    const isSameAsCurrentPassword = await comparePassword(newPassword, recruiter.passwordHash);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password. Please choose a different password.' });
    }

    recruiter.passwordHash = await hashPassword(newPassword);
    await recruiter.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadCandidateResume = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).select('name profile.resumeUrl profile.resumeFilename');
    if (!candidate) return res.status(404).json({ error: 'No resume available.' });

    const resumeUrl = candidate.profile?.resumeUrl;
    if (!resumeUrl) return res.status(404).json({ error: 'No resume available.' });

    try {
      await walletController.applyResumeDownloadCharge(req.user.id, {
        candidateId: candidate._id,
        candidateName: candidate.name || 'Candidate',
        jobTitle: 'Resume Download',
      });
    } catch (chargeError) {
      if (chargeError.status === 400) {
        return res.status(400).json({
          error: chargeError.message,
          availableBalance: chargeError.details?.availableBalance,
          requiredAmount: chargeError.details?.requiredAmount,
        });
      }
      throw chargeError;
    }

    const fileName = resolveResumeFileName(candidate);

    if (resumeUrl.includes('/uploads/')) {
      const relativePath = resumeUrl.split('/uploads/')[1] || '';
      const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
      return res.download(localPath, fileName, (err) => {
        if (err) {
          console.error('Failed to download local resume:', err);
          if (!res.headersSent) {
            res.status(404).json({ error: 'No resume available.' });
          }
        }
      });
    }

    const remoteUrl = new URL(resumeUrl);
    const transport = remoteUrl.protocol === 'https:' ? https : http;

    return transport.get(resumeUrl, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        console.error('Remote resume fetch failed with status', proxyRes.statusCode, resumeUrl);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Unable to retrieve resume file' });
        }
        return;
      }

      const contentType = proxyRes.headers['content-type'] || 'application/pdf';
      setDownloadHeaders(res, fileName, contentType);
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Resume download failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to download resume file' });
      }
    });
  } catch (err) {
    console.error('Recruiter resume download failed:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.checkCandidateResumeAvailability = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId).select('profile.resumeUrl profile.resumeFilename');
    if (!candidate || !candidate.profile?.resumeUrl) {
      return res.status(404).json({ error: 'No resume available.' });
    }

    return res.json({
      available: true,
      resumeFilename: candidate.profile?.resumeFilename || resolveResumeFileName(candidate),
    });
  } catch (err) {
    console.error('Resume availability check failed:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getDownloadedResumes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
      userType: 'recruiter',
      userId: req.user.id,
      purpose: 'resume_download',
      status: 'success',
    };

    const [total, downloads] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedResumeDownload.candidate', 'name uniqueId profile.resumeFilename profile.resumeUrl'),
    ]);

    const payload = downloads.map((download) => {
      const candidate = download.relatedResumeDownload?.candidate;

      return {
        id: download._id,
        candidateId: candidate?._id || null,
        candidateName: candidate?.name || 'Unknown',
        candidateUniqueId: candidate?.uniqueId || '',
        resumeFilename: resolveResumeFileName(candidate),
        resumeUrl: candidate?.profile?.resumeUrl || '',
        downloadedAt: download.createdAt,
        paymentAmount: download.amount,
        paymentId: download._id,
      };
    });

    res.json({
      items: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    console.error('Failed to load downloaded resumes:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadedResume = async (req, res) => {
  try {
    const deleted = await Payment.findOneAndDelete({
      _id: req.params.paymentId,
      userType: 'recruiter',
      userId: req.user.id,
      purpose: 'resume_download',
      status: 'success',
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Saved resume record not found' });
    }

    return res.json({ message: 'Saved resume record deleted' });
  } catch (err) {
    console.error('Failed to delete saved resume record:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.downloadPurchasedResume = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      userType: 'recruiter',
      userId: req.user.id,
      purpose: 'resume_download',
      status: 'success',
    }).populate('relatedResumeDownload.candidate', 'profile.resumeUrl profile.resumeFilename');

    if (!payment) return res.status(404).json({ error: 'Downloaded resume not found' });

    const candidate = payment.relatedResumeDownload?.candidate;
    if (!candidate) return res.status(404).json({ error: 'No resume available.' });

    const resumeUrl = candidate.profile?.resumeUrl;
    if (!resumeUrl) return res.status(404).json({ error: 'No resume available.' });

    const fileName = resolveResumeFileName(candidate);

    if (resumeUrl.includes('/uploads/')) {
      const relativePath = resumeUrl.split('/uploads/')[1] || '';
      const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
      return res.download(localPath, fileName, (err) => {
        if (err) {
          console.error('Failed to download local resume:', err);
          if (!res.headersSent) {
            res.status(404).json({ error: 'No resume available.' });
          }
        }
      });
    }

    const remoteUrl = new URL(resumeUrl);
    const transport = remoteUrl.protocol === 'https:' ? https : http;

    return transport.get(resumeUrl, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        console.error('Remote resume fetch failed with status', proxyRes.statusCode, resumeUrl);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Unable to retrieve resume file' });
        }
        return;
      }

      const contentType = proxyRes.headers['content-type'] || 'application/pdf';
      setDownloadHeaders(res, fileName, contentType);
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Purchased resume download failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to download resume file' });
      }
    });
  } catch (err) {
    console.error('Purchased resume download failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/me/team
exports.listTeamMembers = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.user.id).select('teamMembers');
    if (!recruiter) return res.status(404).json({ error: 'Recruiter account not found' });
    return res.json({ teamMembers: recruiter.teamMembers || [] });
  } catch (err) {
    console.error('Failed to list team members:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/me/team/invite
exports.inviteTeamMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address' });

    const inviter = await Recruiter.findById(req.user.id).select('companyName teamMembers');
    if (!inviter) return res.status(404).json({ error: 'Recruiter account not found' });

    const target = await Recruiter.findOne({ email: email.toLowerCase() }).select('companyName email');
    if (!target) {
      return res.status(404).json({ error: 'Recruiter with this email not found. They must register first.' });
    }

    if (((target.companyName || '').trim().toLowerCase()) !== ((inviter.companyName || '').trim().toLowerCase())) {
      return res.status(403).json({ error: 'Can only invite recruiters from the same company' });
    }

    // prevent duplicates
    if ((inviter.teamMembers || []).some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Team member already invited' });
    }

    const member = { email: email.toLowerCase(), role: role || 'recruiter', status: 'pending', invitedAt: new Date() };
    inviter.teamMembers = inviter.teamMembers || [];
    inviter.teamMembers.push(member);
    await inviter.save();

    return res.json({ message: 'Invite successful', member });
  } catch (err) {
    console.error('Invite team member failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/recruiter/me/team/:email
exports.removeTeamMember = async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) return res.status(400).json({ error: 'Email parameter required' });

    const recruiter = await Recruiter.findById(req.user.id).select('teamMembers');
    if (!recruiter) return res.status(404).json({ error: 'Recruiter account not found' });

    const before = (recruiter.teamMembers || []).length;
    recruiter.teamMembers = (recruiter.teamMembers || []).filter((m) => m.email.toLowerCase() !== String(email).toLowerCase());
    if (recruiter.teamMembers.length === before) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await recruiter.save();
    return res.json({ message: 'Team member removed' });
  } catch (err) {
    console.error('Remove team member failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/me/invites
exports.listInvites = async (req, res) => {
  try {
    const me = await Recruiter.findById(req.user.id).select('email');
    if (!me) return res.status(404).json({ error: 'Recruiter account not found' });

    const invites = await Recruiter.find({ 'teamMembers.email': me.email, 'teamMembers.status': 'pending' }).select(
      'companyName email teamMembers'
    );

    const payload = [];
    for (const inviter of invites) {
      const entry = (inviter.teamMembers || []).find((m) => m.email.toLowerCase() === me.email.toLowerCase() && m.status === 'pending');
      if (entry) {
        payload.push({ inviterEmail: inviter.email, inviterCompany: inviter.companyName, role: entry.role, invitedAt: entry.invitedAt });
      }
    }

    return res.json({ invites: payload });
  } catch (err) {
    console.error('Failed to list incoming invites:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/me/invites/accept
exports.acceptInvite = async (req, res) => {
  try {
    const { inviterEmail } = req.body;
    if (!inviterEmail) return res.status(400).json({ error: 'inviterEmail is required' });

    const me = await Recruiter.findById(req.user.id).select('email');
    if (!me) return res.status(404).json({ error: 'Recruiter account not found' });

    const inviter = await Recruiter.findOne({ email: inviterEmail.toLowerCase() }).select('teamMembers');
    if (!inviter) return res.status(404).json({ error: 'Inviter not found' });

    const member = (inviter.teamMembers || []).find((m) => m.email.toLowerCase() === me.email.toLowerCase() && m.status === 'pending');
    if (!member) return res.status(404).json({ error: 'Invite not found' });

    // mark as active
    inviter.teamMembers = (inviter.teamMembers || []).map((m) =>
      m.email.toLowerCase() === me.email.toLowerCase() ? { ...m, status: 'active', acceptedAt: new Date() } : m
    );
    await inviter.save();

    return res.json({ message: 'Invite accepted' });
  } catch (err) {
    console.error('Accept invite failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/me/invites/decline
exports.declineInvite = async (req, res) => {
  try {
    const { inviterEmail } = req.body;
    if (!inviterEmail) return res.status(400).json({ error: 'inviterEmail is required' });

    const me = await Recruiter.findById(req.user.id).select('email');
    if (!me) return res.status(404).json({ error: 'Recruiter account not found' });

    const inviter = await Recruiter.findOne({ email: inviterEmail.toLowerCase() }).select('teamMembers');
    if (!inviter) return res.status(404).json({ error: 'Inviter not found' });

    const before = (inviter.teamMembers || []).length;
    inviter.teamMembers = (inviter.teamMembers || []).filter((m) => m.email.toLowerCase() !== me.email.toLowerCase());
    if (inviter.teamMembers.length === before) return res.status(404).json({ error: 'Invite not found' });

    await inviter.save();
    return res.json({ message: 'Invite declined' });
  } catch (err) {
    console.error('Decline invite failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/me/upload-profile-picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const recruiter = await Recruiter.findById(req.user.id);
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Delete old profile picture if it exists
    if (recruiter.profilePictureUrl && recruiter.profilePictureUrl.includes('cloudinary')) {
      try {
        const publicId = recruiter.profilePictureUrl.split('/').pop().split('.')[0];
        await require('../config/cloudinary').cloudinary.uploader.destroy(`recruiter-profile-pictures/${publicId}`);
      } catch (err) {
        console.warn('Could not delete old profile picture:', err.message);
      }
    }

    // Upload new profile picture to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = require('../config/cloudinary').cloudinary.uploader.upload_stream(
        {
          folder: 'recruiter-profile-pictures',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const uploadResult = await uploadPromise;
    recruiter.profilePictureUrl = uploadResult.secure_url;
    await recruiter.save();

    console.log('✅ Recruiter profile picture uploaded:', recruiter.profilePictureUrl);
    res.json({
      message: 'Profile picture uploaded successfully',
      profilePictureUrl: recruiter.profilePictureUrl,
    });
  } catch (err) {
    console.error('❌ Profile picture upload failed:', err);
    res.status(500).json({ error: err.message || 'Failed to upload profile picture' });
  }
};

// DELETE /api/recruiter/me/profile-picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.user.id);
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    if (!recruiter.profilePictureUrl) {
      return res.status(400).json({ error: 'No profile picture to delete' });
    }

    // Delete from Cloudinary
    if (recruiter.profilePictureUrl.includes('cloudinary')) {
      try {
        const publicId = recruiter.profilePictureUrl.split('/').pop().split('.')[0];
        await require('../config/cloudinary').cloudinary.uploader.destroy(`recruiter-profile-pictures/${publicId}`);
      } catch (err) {
        console.warn('Could not delete profile picture from Cloudinary:', err.message);
      }
    }

    recruiter.profilePictureUrl = null;
    await recruiter.save();

    console.log('✅ Recruiter profile picture deleted');
    res.json({ message: 'Profile picture deleted successfully' });
  } catch (err) {
    console.error('❌ Profile picture deletion failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete profile picture' });
  }
};
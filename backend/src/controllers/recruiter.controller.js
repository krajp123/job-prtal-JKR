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

// GET /api/recruiter/me
exports.getMyProfile = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.user.id).select('-passwordHash');
    res.json(recruiter);
  } catch (err) {
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
      companyDetails,
      companyLogoUrl,
    } = req.body;

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
    if (companyDetails !== undefined) update.companyDetails = companyDetails;
    if (companyLogoUrl !== undefined) update.companyLogoUrl = companyLogoUrl;

    const recruiter = await Recruiter.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      '-passwordHash'
    );

    res.json(recruiter);
  } catch (err) {
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

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
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
const Candidate = require('../../models/Candidate');
const Recruiter = require('../../models/Recruiter');
const Job = require('../../models/Job');
const Application = require('../../models/Application');
const Wallet = require('../../models/Wallet');
const Payment = require('../../models/Payment');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { logAdminAction } = require('../../services/audit.service');
const { sendPasswordResetLinkEmail, sendCandidateAccountStatusEmail } = require('../../services/email.service');

function buildDateSeries(days) {
  const series = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    series.push({
      key,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      value: 0,
    });
  }
  return series;
}

function buildCandidateAnalyticsBuckets(rangeKey = '6m') {
  const buckets = [];
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (rangeKey === '1w' || rangeKey === '1m') {
    const days = rangeKey === '1w' ? 7 : 30;
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - i);
      buckets.push({
        key: date.toISOString().slice(0, 10),
        label: String(date.getDate()),
        date,
      });
    }
    return buckets;
  }

  const count = rangeKey === '6m' ? 6 : 12;
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setMonth(now.getMonth() - i);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: monthNames[date.getMonth()],
      date,
    });
  }

  return buckets;
}

function normalizeRecruiterPayload(recruiter, extra = {}) {
  const plain = recruiter.toObject ? recruiter.toObject() : { ...recruiter };
  const jobs = extra.jobs || [];
  const transactions = extra.transactions || [];
  const adminActions = extra.adminActions || [];
  const walletBalance = extra.walletBalance ?? plain.walletBalance ?? 0;

  return {
    ...plain,
    ...extra,
    walletBalance,
    adminNotes: plain.adminNotes || '',
    kycDocuments: plain.kycDocuments || [],
    jobs: jobs.map((job) => ({
      id: job._id?.toString?.() || job.id,
      title: job.title,
      status: job.status,
      applications: Number(job.applications || 0),
      createdAt: job.createdAt,
    })),
    transactions: transactions.map((tx) => ({
      id: tx._id?.toString?.() || tx.id,
      type: tx.type || 'manual',
      amount: Number(tx.amount || 0),
      description: tx.description || tx.reason || 'Wallet transaction',
      timestamp: tx.createdAt || tx.timestamp || new Date().toISOString(),
      status: tx.status || 'success',
    })),
    adminActions: adminActions.map((entry) => ({
      id: entry._id?.toString?.() || entry.id,
      action: entry.action,
      admin: entry.admin?.name || 'Admin',
      reason: entry.details?.reason || '',
      timestamp: entry.createdAt || entry.timestamp,
    })),
    loginHistory: extra.loginHistory || [],
    flags: plain.flags || [],
    totalJobsPosted: extra.totalJobsPosted ?? jobs.length,
    activeJobs: extra.activeJobs ?? jobs.filter((job) => ['open', 'active'].includes(job.status)).length,
    totalApplications: extra.totalApplications ?? 0,
    totalHires: extra.totalHires ?? 0,
    subscriptionPlan: extra.subscriptionPlan || 'Standard',
    companyDescription: plain.companyDetails || plain.bio || '',
    createdAt: plain.createdAt || plain.registeredAt || new Date().toISOString(),
  };
}

// GET /admin-api/users/candidates
exports.listCandidates = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.accountStatus = status;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
        { uniqueId: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const [candidates, totalCount] = await Promise.all([
      Candidate.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    res.json({
      candidates,
      totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/candidates/:id
exports.getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('-passwordHash').lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      ...candidate,
      profilePictureUrl: candidate.profile?.profilePictureUrl || null,
      resumeUrl: candidate.profile?.resumeUrl || null,
      resumeFilename: candidate.profile?.resumeFilename || null,
      createdAt: candidate.createdAt || candidate.registeredAt,
      lastActiveAt: candidate.loginHistory?.[candidate.loginHistory.length - 1]?.timestamp || candidate.updatedAt || candidate.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/candidates/:id/applications
exports.getCandidateApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.params.id })
      .populate('job', 'title status')
      .populate('recruiter', 'companyName')
      .populate('candidate', 'profile')
      .sort({ appliedAt: -1 })
      .lean();

    const payload = applications.map((application) => ({
      id: application._id.toString(),
      jobId: application.job?._id?.toString?.() || application.job,
      jobTitle: application.job?.title || 'Untitled job',
      companyName: application.recruiter?.companyName || 'Unknown company',
      status: application.status || 'applied',
      appliedAt: application.appliedAt,
      resumeUrl: application.candidate?.profile?.resumeUrl || null,
      resumeFilename: application.candidate?.profile?.resumeFilename || null,
    }));

    res.json({ applications: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/candidates/:id/activity
exports.getCandidateActivity = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('loginHistory');

    // Keep only last 5 logins, delete older ones
    if (candidate && candidate.loginHistory && candidate.loginHistory.length > 5) {
      candidate.loginHistory = candidate.loginHistory.slice(-5);
      await candidate.save();
    }

    const candidateLogins = (candidate?.loginHistory || []).map((entry) => ({
      id: `${entry.timestamp || Date.now()}-login`,
      type: 'login',
      description: 'Candidate logged in',
      timestamp: entry.timestamp || new Date(),
      device: entry.device || 'Unknown device',
      ip: entry.ip || 'Unknown IP',
    }));

    const applications = await Application.find({ candidate: req.params.id })
      .populate('job', 'title')
      .sort({ appliedAt: -1 })
      .lean();

    const applicationLogs = applications.map((application) => ({
      id: `${application._id}-application`,
      type: 'application',
      description: `Applied for ${application.job?.title || 'job'}`,
      timestamp: application.appliedAt || application.createdAt,
      device: 'Application system',
      ip: 'System',
    }));

    // Keep only 5 most recent admin actions, delete older ones
    const adminActions = await AdminAuditLog.find({ targetType: 'Candidate', targetId: req.params.id })
      .populate('admin', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (adminActions.length > 5) {
      const idsToDelete = adminActions.slice(5).map((entry) => entry._id);
      await AdminAuditLog.deleteMany({ _id: { $in: idsToDelete } });
    }

    const auditLogs = adminActions.slice(0, 5).map((entry) => ({
      id: entry._id.toString(),
      type: 'status_change',
      description: entry.action || 'Admin action',
      timestamp: entry.createdAt,
      device: entry.admin?.name || 'Admin',
      ip: entry.ip || 'System',
    }));

    const activity = [...candidateLogins, ...applicationLogs, ...auditLogs]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 5);

    res.json({ activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/candidates/:id/notes
exports.getCandidateNotes = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('adminNotes').lean();
    res.json({ notes: candidate?.adminNotes || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /admin-api/users/candidates/:id/notes
exports.addCandidateNote = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Note message is required' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const note = {
      message: String(message).trim(),
      author: req.admin?.name || 'Admin',
      createdAt: new Date(),
    };

    candidate.adminNotes = candidate.adminNotes || [];
    candidate.adminNotes.unshift(note);
    await candidate.save();

    await logAdminAction({
      adminId: req.admin.id,
      action: 'ADDED_CANDIDATE_NOTE',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { message: note.message },
      ip: req.ip,
    });

    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/candidates/:id/verify
exports.setCandidateVerification = async (req, res) => {
  try {
    const { isVerified } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { isVerified: Boolean(isVerified) },
      { new: true }
    ).select('-passwordHash');

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SET_CANDIDATE_VERIFICATION',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { isVerified: Boolean(isVerified) },
      ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /admin-api/users/candidates/:id/send-password-reset
exports.sendCandidatePasswordReset = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    candidate.passwordResetToken = resetToken;
    candidate.passwordResetExpiry = resetTokenExpiry;
    await candidate.save();

    const emailResult = await sendPasswordResetLinkEmail(candidate.email, resetToken, candidate.name);
    if (!emailResult.sent) {
      return res.status(500).json({
        error: emailResult.error || 'Failed to send reset link email to candidate',
      });
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SENT_CANDIDATE_PASSWORD_RESET',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { email: candidate.email },
      ip: req.ip,
    });

    res.json({
      message: 'Password reset link sent to candidate email',
      email: candidate.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/recruiters
exports.listRecruiters = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.accountStatus = status;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { fullName: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { companyName: { $regex: cleanSearch, $options: 'i' } },
        { companyEmail: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const [recruiters, totalCount] = await Promise.all([
      Recruiter.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Recruiter.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    res.json({
      recruiters,
      totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/recruiters/:id
exports.getRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id).select('-passwordHash');
    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    const [jobs, wallet, totalApplications, totalHires, adminLogs] = await Promise.all([
      Job.find({ postedBy: recruiter._id }).sort({ createdAt: -1 }).lean(),
      Wallet.findOne({ recruiter: recruiter._id }).lean(),
      Application.countDocuments({ recruiter: recruiter._id }),
      Application.countDocuments({ recruiter: recruiter._id, status: 'hired' }),
      AdminAuditLog.find({ targetType: 'Recruiter', targetId: recruiter._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('admin', 'name')
        .lean(),
    ]);

    const jobApplications = await Promise.all(
      jobs.map(async (job) => ({
        id: job._id.toString(),
        applications: await Application.countDocuments({ job: job._id }),
      }))
    );

    const jobMap = Object.fromEntries(jobApplications.map((entry) => [entry.id, entry.applications]));
    const transactions = (wallet?.transactions || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const payload = normalizeRecruiterPayload(recruiter, {
      jobs: jobs.map((job) => ({ ...job, applications: jobMap[job._id.toString()] || 0 })),
      walletBalance: wallet?.balance ?? recruiter.walletBalance ?? 0,
      transactions,
      adminActions: adminLogs,
      loginHistory: (recruiter.loginHistory || [])
        .slice()
        .reverse()
        .slice(0, 3)
        .map((log) => ({
          ip: log.ip || 'Unknown',
          device: log.device || 'Unknown',
          timestamp: new Date(log.timestamp).toLocaleString('en-GB'),
        })),
      totalJobsPosted: jobs.length,
      activeJobs: jobs.filter((job) => ['open', 'active'].includes(job.status)).length,
      totalApplications,
      totalHires,
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/candidates/:id/status  body: { status: 'active'|'suspended' }
exports.setCandidateStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const candidate = await Candidate.findById(req.params.id).select('-passwordHash');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const previousStatus = candidate.accountStatus;
    candidate.accountStatus = status;
    await candidate.save();

    // Send email notification for all status changes
    const emailResult = await sendCandidateAccountStatusEmail(candidate.email, candidate.name, status, reason || '');
    if (!emailResult.sent) {
      console.warn(`Account status email failed for candidate ${candidate.email}:`, emailResult.error || 'Unknown email error');
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SET_CANDIDATE_STATUS',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { previousStatus, newStatus: status, reason: reason || '' },
      ip: req.ip,
    });

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/status
exports.setRecruiterStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { accountStatus: status },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SET_RECRUITER_STATUS',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { newStatus: status },
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/verify
exports.verifyRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'verified' },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'VERIFIED_RECRUITER',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/reject-verification
exports.rejectRecruiterVerification = async (req, res) => {
  try {
    const { reason } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'rejected' },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'REJECTED_RECRUITER_VERIFICATION',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { reason },
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/suspend
exports.suspendRecruiter = async (req, res) => {
  try {
    const { reason } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'suspended' },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SUSPENDED_RECRUITER',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { reason },
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/activate
exports.activateRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'active' },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'ACTIVATED_RECRUITER',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/ban
exports.banRecruiter = async (req, res) => {
  try {
    const { reason } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'banned' },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'BANNED_RECRUITER',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { reason },
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /admin-api/users/recruiters/:id/reset-password
exports.resetRecruiterPassword = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await Recruiter.updateOne(
      { _id: req.params.id },
      { passwordResetToken: resetToken, passwordResetExpiry: resetTokenExpiry }
    );

    console.log(`Reset link for ${recruiter.email}: http://yourapp.com/reset-password/${resetToken}`);

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SENT_PASSWORD_RESET',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      ip: req.ip,
    });

    res.json({ message: 'Password reset link sent to recruiter email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/notes
exports.updateRecruiterNotes = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      { adminNotes },
      { new: true }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'UPDATED_RECRUITER_NOTES',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/documents/:docId
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { docId } = req.params;
    const { status } = req.body;

    const recruiter = await Recruiter.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'kycDocuments.$[elem].status': status,
          'kycDocuments.$[elem].reviewedAt': new Date(),
        },
      },
      {
        arrayFilters: [{ 'elem.id': docId }],
        new: true,
      }
    ).select('-passwordHash');

    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'UPDATED_DOCUMENT_STATUS',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { docId, newStatus: status },
      ip: req.ip,
    });

    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/recruiters/:id/wallet/adjust
exports.adjustRecruiterWallet = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const delta = Number(amount || 0);

    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    let wallet = await Wallet.findOne({ recruiter: recruiter._id });
    if (!wallet) {
      wallet = await Wallet.create({ recruiter: recruiter._id, balance: recruiter.walletBalance || 0, transactions: [], totalAdded: 0, totalSpent: 0, resumesDownloaded: 0 });
    }

    const nextBalance = Math.max(0, wallet.balance + delta);
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    const adminActionLabel = delta >= 0
      ? (trimmedReason ? `Added by admin: ${trimmedReason}` : 'Added by admin')
      : (trimmedReason ? `Deducted by admin: ${trimmedReason}` : 'Deducted by admin');

    wallet.balance = nextBalance;
    wallet.transactions.push({
      type: delta >= 0 ? 'recharge' : 'refund',
      description: adminActionLabel,
      reference: `ADMIN-${Date.now()}`,
      amount: delta,
      balanceAfter: nextBalance,
      status: 'success',
      createdAt: new Date(),
    });
    if (delta > 0) wallet.totalAdded += delta;
    if (delta < 0) wallet.totalSpent += Math.abs(delta);
    await wallet.save();

    recruiter.walletBalance = nextBalance;
    await recruiter.save();

    await logAdminAction({
      adminId: req.admin.id,
      action: 'ADJUSTED_RECRUITER_WALLET',
      targetType: 'Recruiter',
      targetId: recruiter._id,
      details: { amount: delta, reason, newBalance: nextBalance },
      ip: req.ip,
    });

    res.json({
      ...recruiter.toObject(),
      walletBalance: nextBalance,
      message: 'Wallet adjusted successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/recruiters/:id/analytics
exports.getRecruiterAnalytics = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });

    const { metric = 'jobs_posted', days = 7 } = req.query;
    const daysInt = Math.max(1, parseInt(days, 10) || 7);
    const data = await generateRealAnalytics(recruiter._id, metric, daysInt);

    res.json({ metric, days: daysInt, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCandidateAnalytics = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('_id').lean();
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const metric = ['applications', 'shortlisted', 'interviews', 'activity'].includes(req.query.metric)
      ? req.query.metric
      : 'applications';
    const range = ['1w', '1m', '6m', '1y'].includes(req.query.range) ? req.query.range : '6m';

    const buckets = buildCandidateAnalyticsBuckets(range);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, 0]));
    const start = new Date(buckets[0].date);
    start.setHours(0, 0, 0, 0);

    const candidateData = await Candidate.findById(req.params.id).select('loginHistory').lean();
    const loginHistory = candidateData?.loginHistory || [];

    for (const entry of loginHistory) {
      if (!entry?.timestamp) continue;
      const eventDate = new Date(entry.timestamp);
      if (eventDate < start) continue;
      const key = range === '1w' || range === '1m'
        ? eventDate.toISOString().slice(0, 10)
        : `${eventDate.getFullYear()}-${eventDate.getMonth()}`;

      if (bucketMap.has(key)) {
        bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
      }
    }

    const applications = await Application.find({
      candidate: req.params.id,
      createdAt: { $gte: start },
    }).select('createdAt status').lean();

    for (const app of applications) {
      const createdAt = new Date(app.createdAt);
      if (createdAt < start) continue;
      const key = range === '1w' || range === '1m'
        ? createdAt.toISOString().slice(0, 10)
        : `${createdAt.getFullYear()}-${createdAt.getMonth()}`;

      if (!bucketMap.has(key)) continue;

      const status = String(app.status || '').toLowerCase();
      const isApplication = metric === 'applications';
      const isShortlisted = metric === 'shortlisted' && status === 'shortlisted';
      const isInterview = metric === 'interviews' && ['interview', 'interviewed'].includes(status);
      const isActivity = metric === 'activity';

      if (isApplication || isShortlisted || isInterview || isActivity) {
        bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
      }
    }

    const data = buckets.map((bucket) => bucketMap.get(bucket.key) || 0);

    res.json({
      metric,
      range,
      labels: buckets.map((bucket) => bucket.label),
      data,
    });
  } catch (err) {
    console.error('Error generating candidate analytics:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/candidates/:id/resume/download - admin download candidate resume
exports.downloadCandidateResume = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select('profile.resumeUrl profile.resumeFilename');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const resumeUrl = candidate.profile?.resumeUrl;
    if (!resumeUrl) return res.status(404).json({ error: 'No resume found' });

    const path = require('path');
    const http = require('http');
    const https = require('https');

    let fileName = candidate.profile?.resumeFilename || '';
    if (!fileName) {
      fileName = decodeURIComponent(resumeUrl.split('/').pop()?.split('?')[0] || 'resume.pdf');
    }
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName = `${fileName}.pdf`;
    }

    // Handle local uploads
    if (resumeUrl.includes('/uploads/')) {
      const relativePath = resumeUrl.split('/uploads/')[1] || '';
      const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return res.sendFile(localPath, (err) => {
        if (err) {
          console.error('Failed to download candidate resume:', err);
          if (!res.headersSent) {
            return res.status(404).json({ error: 'Resume not available' });
          }
        }
      });
    }

    // Handle remote URLs (Cloudinary, R2, etc.)
    const remoteUrl = new URL(resumeUrl);
    const transport = remoteUrl.protocol === 'https:' ? https : http;

    return transport.get(resumeUrl, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        console.error('Resume fetch failed with status', proxyRes.statusCode, resumeUrl);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Unable to retrieve resume file' });
        }
        return;
      }

      // Always force PDF content type for resumes
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Resume download failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to download resume file' });
      }
    });
  } catch (err) {
    console.error('Resume download failed:', err);
    res.status(500).json({ error: err.message });
  }
};

async function generateRealAnalytics(recruiterId, metric, days) {
  const series = buildDateSeries(days);
  const map = new Map(series.map((entry) => [entry.key, entry]));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  let records = [];

  if (metric === 'jobs_posted') {
    records = await Job.find({ postedBy: recruiterId, createdAt: { $gte: start } }).lean();
    for (const job of records) {
      const key = new Date(job.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    }
  } else if (metric === 'shortlisted') {
    records = await Application.find({ recruiter: recruiterId, status: 'shortlisted', createdAt: { $gte: start } }).lean();
    for (const item of records) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    }
  } else if (metric === 'selected') {
    records = await Application.find({ recruiter: recruiterId, status: { $in: ['hired', 'accepted', 'offered'] }, createdAt: { $gte: start } }).lean();
    for (const item of records) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    }
  } else if (metric === 'resume_downloads') {
    records = await Payment.find({ userType: 'recruiter', userId: recruiterId, purpose: 'resume_download', status: 'success', createdAt: { $gte: start } }).lean();
    for (const item of records) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    }
  } else if (metric === 'resume_spend') {
    records = await Payment.find({ userType: 'recruiter', userId: recruiterId, purpose: 'resume_download', status: 'success', createdAt: { $gte: start } }).lean();
    for (const item of records) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += Number(item.amount || 0);
    }
  } else if (metric === 'rejected') {
    records = await Application.find({ recruiter: recruiterId, status: 'rejected', createdAt: { $gte: start } }).lean();
    for (const item of records) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    }
  }

  return Array.from(map.values()).map((entry) => ({
    date: entry.date,
    fullDate: entry.fullDate,
    value: Number(entry.value || 0),
  }));
}

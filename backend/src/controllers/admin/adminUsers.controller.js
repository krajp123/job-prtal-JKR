const Candidate = require('../../models/Candidate');
const Recruiter = require('../../models/Recruiter');
const { logAdminAction } = require('../../services/audit.service');

// GET /admin-api/users/candidates
exports.listCandidates = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.accountStatus = status;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { uniqueId: { $regex: search, $options: 'i' } },
    ];

    const candidates = await Candidate.find(query).select('-passwordHash').limit(100);
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/recruiters
exports.listRecruiters = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.accountStatus = status;
    if (search) query.companyName = { $regex: search, $options: 'i' };

    const recruiters = await Recruiter.find(query).select('-passwordHash').limit(100);
    res.json(recruiters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/users/recruiters/:id
exports.getRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id).select('-passwordHash');
    if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });
    res.json(recruiter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/users/candidates/:id/status  body: { status: 'active'|'suspended' }
exports.setCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { accountStatus: status },
      { new: true }
    ).select('-passwordHash');

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'SET_CANDIDATE_STATUS',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { newStatus: status },
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

const Job = require('../../models/Job');
const Application = require('../../models/Application');
const JobReopenRequest = require('../../models/JobReopenRequest');
const { createNotification } = require('../../services/notification.service');
const { logAdminAction } = require('../../services/audit.service');

const RESOLVED_REQUEST_RETENTION_MS = 48 * 60 * 60 * 1000;

async function cleanupResolvedReopenRequests() {
  const cutoff = new Date(Date.now() - RESOLVED_REQUEST_RETENTION_MS);
  const result = await JobReopenRequest.deleteMany({
    status: { $in: ['approved', 'rejected'] },
    updatedAt: { $lt: cutoff },
  });
  return result.deletedCount || 0;
}

// GET /admin-api/jobs
exports.listJobs = async (req, res) => {
  try {
    const { status, recruiter, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status) query.status = status;
    if (recruiter) query.postedBy = recruiter;

    // Get all jobs that match status/recruiter filters first
    let jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .populate('postedBy', 'fullName companyName email companyLogoUrl accountStatus')
      .lean();

    // Apply search filter - ONLY on title, recruiter name, and company name
    if (search && String(search).trim().length > 0) {
      const term = String(search).trim().toLowerCase();
      jobs = jobs.filter((job) => {
        const recruiterName = (job.postedBy?.fullName || '').toLowerCase();
        const companyName = (job.postedBy?.companyName || '').toLowerCase();
        const jobTitle = (job.title || '').toLowerCase();

        return (
          jobTitle.includes(term) ||
          recruiterName.includes(term) ||
          companyName.includes(term)
        );
      });
    }

    const totalCount = jobs.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Apply pagination
    const paginatedJobs = jobs.slice(skip, skip + limitNum);

    // Get application counts
    const counts = await Application.aggregate([
      { $match: { job: { $in: paginatedJobs.map((job) => job._id) } } },
      { $group: { _id: '$job', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));
    const jobsWithCounts = paginatedJobs.map((job) => ({
      ...job,
      recruiter: job.postedBy,
      applicantsCount: countMap.get(String(job._id)) ?? 0,
    }));

    res.json({
      jobs: jobsWithCounts,
      totalCount,
      totalPages,
      currentPage: pageNum,
    });
  } catch (err) {
    console.error('Error in listJobs:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/jobs/:id
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'fullName companyName email phone companyLogoUrl companyWebsite industry accountStatus verificationStatus')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get applicant count
    const applicantCount = await Application.countDocuments({ job: job._id });
    
    // Rename skillsRequired to skills for frontend compatibility
    const jobData = {
      ...job,
      skills: job.skillsRequired || [],
      recruiter: job.postedBy, // Also include as recruiter for frontend compatibility
      applicantsCount: applicantCount
    };
    
    res.json(jobData);
  } catch (err) {
    console.error('Error in getJob:', err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/jobs/:id/status
exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'closed', 'active', 'draft'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const updateData = { status };
    if (status === 'closed') {
      updateData.adminClosed = true;
    } else {
      updateData.adminClosed = false;
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'UPDATE_JOB_STATUS',
      targetType: 'Job',
      targetId: req.params.id,
      details: { status },
      ip: req.ip,
    });

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/applications
exports.listApplications = async (req, res) => {
  try {
    const { jobId, search, status, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (jobId) query.job = jobId;
    if (status && status !== 'all') query.status = status;

    // Get all applications that match filters first
    let applications = await Application.find(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name email phone')
      .populate('job', 'title')
      .populate('recruiter', 'fullName companyName email')
      .lean();

    // Apply search filter - search by candidate name, email, phone, or job title
    if (search && String(search).trim().length > 0) {
      const term = String(search).trim().toLowerCase();
      applications = applications.filter((app) => {
        const candidateName = (app.candidate?.name || '').toLowerCase();
        const candidateEmail = (app.candidate?.email || '').toLowerCase();
        const candidatePhone = (app.candidate?.phone || '').toString().toLowerCase();
        const jobTitle = (app.job?.title || '').toLowerCase();

        return (
          candidateName.includes(term) ||
          candidateEmail.includes(term) ||
          candidatePhone.includes(term) ||
          jobTitle.includes(term)
        );
      });
    }

    const totalCount = applications.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Apply pagination
    const paginatedApplications = applications.slice(skip, skip + limitNum);

    res.json({
      applications: paginatedApplications,
      totalCount,
      totalPages,
      currentPage: pageNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/jobs/reopen-requests
exports.listReopenRequests = async (req, res) => {
  try {
    await cleanupResolvedReopenRequests();

    const { status, jobId, recruiterId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (jobId) query.job = jobId;
    if (recruiterId) query.recruiter = recruiterId;

    const requests = await JobReopenRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('job', 'title status adminClosed')
      .populate('recruiter', 'fullName companyName email')
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/jobs/reopen-requests/:id/approve
exports.approveReopenRequest = async (req, res) => {
  try {
    const request = await JobReopenRequest.findById(req.params.id).populate('job');
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Pending reopen request not found' });
    }

    request.status = 'approved';
    request.adminReply = String(req.body.adminReply || '').trim() || undefined;
    request.adminId = req.admin.id;
    await request.save();

    const job = await Job.findByIdAndUpdate(
      request.job._id,
      { status: 'open', adminClosed: false },
      { new: true }
    );

    const recruiterId = request.recruiter && request.recruiter._id ? request.recruiter._id : request.recruiter;
    const jobTitle = request.job?.title || 'this job';

    if (recruiterId) {
      await createNotification({
        recruiter: recruiterId,
        type: 'system',
        title: 'Job reopen request approved',
        message: `Your request to reopen "${jobTitle}" was approved.${request.adminReply ? ` Admin note: ${request.adminReply}` : ''}`,
        relatedId: request._id,
      });
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'APPROVE_JOB_REOPEN_REQUEST',
      targetType: 'JobReopenRequest',
      targetId: request._id,
      details: {
        jobId: request.job._id.toString(),
        jobTitle: request.job.title,
        recruiterId: request.recruiter?.toString(),
        adminReply: request.adminReply,
      },
      ip: req.ip,
    });

    res.json({ request, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/jobs/reopen-requests/:id/reject
exports.rejectReopenRequest = async (req, res) => {
  try {
    const request = await JobReopenRequest.findById(req.params.id).populate('job');
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Pending reopen request not found' });
    }

    request.status = 'rejected';
    request.adminReply = String(req.body.adminReply || '').trim() || undefined;
    request.adminId = req.admin.id;
    await request.save();

    const recruiterId = request.recruiter && request.recruiter._id ? request.recruiter._id : request.recruiter;
    const jobTitle = request.job?.title || 'this job';

    if (recruiterId) {
      await createNotification({
        recruiter: recruiterId,
        type: 'system',
        title: 'Job reopen request rejected',
        message: `Your request to reopen "${jobTitle}" was rejected.${request.adminReply ? ` Admin note: ${request.adminReply}` : ''}`,
        relatedId: request._id,
      });
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'REJECT_JOB_REOPEN_REQUEST',
      targetType: 'JobReopenRequest',
      targetId: request._id,
      details: {
        jobId: request.job._id.toString(),
        jobTitle: request.job.title,
        recruiterId: request.recruiter?.toString(),
        adminReply: request.adminReply,
      },
      ip: req.ip,
    });

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /admin-api/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await Promise.all([
      Job.findByIdAndDelete(req.params.id),
      Application.deleteMany({ job: req.params.id }),
    ]);

    await logAdminAction({
      adminId: req.admin.id,
      action: 'DELETE_JOB',
      targetType: 'Job',
      targetId: req.params.id,
      details: {
        title: job.title,
        recruiterId: job.postedBy?.toString(),
      },
      ip: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

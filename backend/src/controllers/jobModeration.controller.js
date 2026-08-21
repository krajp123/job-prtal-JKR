const Job = require('../models/Job');
const JobReport = require('../models/JobReport');
const Recruiter = require('../models/Recruiter');
const { getPlatformSettings } = require('../services/platformSettings.service');
const { createAdminNotification } = require('../services/adminNotification.service');
const { createNotification } = require('../services/notification.service');
const { sendEmail } = require('../services/email.service');

exports.reportJob = async (req, res) => {
  try {
    const { reason } = req.body;
    if (typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Please provide a report reason.' });
    }
    const job = await Job.findById(req.params.id).select('postedBy status').lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const report = await JobReport.create({
      job: job._id,
      reportedByType: req.user.role,
      reportedBy: req.user.id,
      reportedByModel: req.user.role === 'candidate' ? 'Candidate' : 'Recruiter',
      reason: reason.trim(),
      statusBeforeModeration: job.status,
    });
    await createAdminNotification({
      key: 'jobFlagged',
      title: 'New job report',
      message: `A new report was submitted for job ${job._id}.`,
      relatedId: report._id,
    });
    const settings = await getPlatformSettings();
    const recruiterJobIds = await Job.find({ postedBy: job.postedBy }).distinct('_id');
    const openReports = await JobReport.countDocuments({
      job: { $in: recruiterJobIds },
      status: { $in: ['pending', 'under_review', 'open'] },
    });
    if (openReports >= settings.moderation.autoSuspendThreshold) {
      await Recruiter.findByIdAndUpdate(job.postedBy, { accountStatus: 'suspended' });
      const recruiterJobs = await Job.find({ postedBy: job.postedBy, status: { $in: ['open', 'active'] } }).select('_id status').lean();
      if (recruiterJobs.length) {
        await Job.bulkWrite(recruiterJobs.map((recruiterJob) => ({
          updateOne: {
            filter: { _id: recruiterJob._id },
            update: { status: 'draft', statusBeforeModeration: recruiterJob.status, moderationStatus: 'flagged' },
          },
        })));
      }
      await JobReport.findByIdAndUpdate(report._id, { autoSuspendedRecruiter: true });
    } else {
      await Job.findByIdAndUpdate(job._id, {
        status: 'draft',
        statusBeforeModeration: job.status,
        moderationStatus: 'flagged',
      });
    }
    res.status(201).json({ message: 'Job reported for review', reportId: report._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'You have already reported this job.' });
    res.status(500).json({ error: error.message });
  }
};

exports.listReports = async (req, res) => {
  try {
    const status = ['pending', 'under_review', 'valid', 'rejected', 'open', 'reviewed', 'dismissed'].includes(req.query.status) ? req.query.status : undefined;
    const query = status ? { status } : {};
    const reports = await JobReport.find(query)
      .sort({ createdAt: -1 })
      .populate('job', 'title status moderationStatus moderationMatches postedBy')
      .populate('reportedBy', 'name fullName email')
      .populate('reviewedBy', 'name email')
      .limit(200)
      .lean();
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reviewReport = async (req, res) => {
  try {
    const { status, reviewNotes = '', action = 'none' } = req.body;
    if (!['pending', 'under_review', 'valid', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid review status' });
    if (!['none', 'warn_recruiter', 'close_job', 'suspend_recruiter', 'remove_job'].includes(action)) return res.status(400).json({ error: 'Invalid moderation action' });
    const report = await JobReport.findById(req.params.id)
      .populate('job', 'title postedBy status statusBeforeModeration')
      .lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const recruiter = await Recruiter.findById(report.job.postedBy).select('email fullName companyName').lean();
    const jobTitle = report.job.title || 'your job';
    const actionMessage = {
      none: `Your report for "${jobTitle}" was marked ${status.replace('_', ' ')}.`,
      warn_recruiter: `Your job "${jobTitle}" received a policy warning. Please review and correct it.`,
      close_job: `Your job "${jobTitle}" was closed after moderation review.`,
      suspend_recruiter: `Your recruiter account was suspended after moderation review of "${jobTitle}".`,
      remove_job: `Your job "${jobTitle}" was removed after moderation review.`,
    }[action];
    const updatedReport = await JobReport.findByIdAndUpdate(
      req.params.id,
      { status, action, reviewNotes: String(reviewNotes).trim(), reviewedBy: req.admin.id, actionTakenAt: action === 'none' ? undefined : new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (status === 'valid') {
      if (action === 'close_job') await Job.findByIdAndUpdate(report.job._id, { status: 'closed', adminClosed: true, moderationStatus: 'reviewed' });
      if (action === 'remove_job') await Job.findByIdAndDelete(report.job._id);
      if (action === 'suspend_recruiter') {
        await Recruiter.findByIdAndUpdate(report.job.postedBy, { accountStatus: 'suspended' });
        const recruiterJobs = await Job.find({ postedBy: report.job.postedBy, status: { $in: ['open', 'active'] } }).select('_id status').lean();
        if (recruiterJobs.length) {
          await Job.bulkWrite(recruiterJobs.map((recruiterJob) => ({
            updateOne: {
              filter: { _id: recruiterJob._id },
              update: { status: 'draft', statusBeforeModeration: recruiterJob.status, moderationStatus: 'flagged' },
            },
          })));
        }
      }
      if (action === 'warn_recruiter') await Job.findByIdAndUpdate(report.job._id, { moderationStatus: 'reviewed' });
    } else if (status === 'rejected') {
      const recruiterJobIds = await Job.find({ postedBy: report.job.postedBy }).distinct('_id');
      const activeReports = await JobReport.countDocuments({
        job: { $in: recruiterJobIds },
        _id: { $ne: report._id },
        status: { $in: ['pending', 'under_review', 'valid'] },
      });
      if (activeReports === 0) {
        const restoredStatus = report.statusBeforeModeration || 'open';
        await Job.findByIdAndUpdate(report.job._id, {
          status: restoredStatus,
          moderationStatus: 'clear',
          $unset: { statusBeforeModeration: 1 },
        });
        if (report.autoSuspendedRecruiter) {
          await Recruiter.findByIdAndUpdate(report.job.postedBy, { accountStatus: 'active' });
          const moderatedJobs = await Job.find({
            postedBy: report.job.postedBy,
            status: 'draft',
            moderationStatus: 'flagged',
            statusBeforeModeration: { $in: ['open', 'active'] },
          }).select('_id statusBeforeModeration').lean();
          if (moderatedJobs.length) {
            const blockedReports = await JobReport.find({
              job: { $in: moderatedJobs.map((moderatedJob) => moderatedJob._id) },
              status: { $in: ['pending', 'under_review', 'valid'] },
            }).select('job').lean();
            const blockedJobIds = new Set(blockedReports.map((blockedReport) => String(blockedReport.job)));
            const restorableJobs = moderatedJobs.filter((moderatedJob) => !blockedJobIds.has(String(moderatedJob._id)));
            if (restorableJobs.length) {
              await Job.bulkWrite(restorableJobs.map((moderatedJob) => ({
                updateOne: {
                  filter: { _id: moderatedJob._id },
                  update: {
                    status: moderatedJob.statusBeforeModeration,
                    moderationStatus: 'clear',
                    $unset: { statusBeforeModeration: 1 },
                  },
                },
              })));
            }
          }
        }
      } else {
        await Job.findByIdAndUpdate(report.job._id, { moderationStatus: 'flagged' });
      }
    } else if (status === 'under_review') {
      await Job.findByIdAndUpdate(report.job._id, { moderationStatus: 'flagged', status: 'draft' });
    }
    if (recruiter && action !== 'none') {
      await createNotification({ recruiter: report.job.postedBy, type: 'system', title: 'Admin action required', message: actionMessage, relatedId: updatedReport._id });
      if (recruiter.email) await sendEmail({ to: recruiter.email, subject: 'Action required for your job posting', body: `${actionMessage}\n\n${String(reviewNotes).trim()}` });
    }
    res.json({ report: updatedReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const Application = require('../models/Application');
const Job = require('../models/Job');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const { checkFirstApplicationBadge, updateApplicationStreak } = require('../services/badge.service');
const { createNotification } = require('../services/notification.service');
const { sendShortlistEmail, sendInterviewScheduleEmail, sendRejectionEmail } = require('../services/email.service');

// Helper function to calculate skill matching
const calculateSkillMatch = (candidateSkills = [], jobSkills = []) => {
  if (jobSkills.length === 0) return { matchedSkills: [], skillsMatch: 0 };
  
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());
  
  const matchedSkills = normalizedJobSkills.filter(skill => 
    normalizedCandidateSkills.includes(skill)
  );
  
  const skillsMatch = Math.round((matchedSkills.length / normalizedJobSkills.length) * 100);
  
  return { matchedSkills, skillsMatch };
};

// POST /api/applications (candidate only)
exports.apply = async (req, res) => {
  try {
    const { jobId } = req.body;
    const Candidate = require('../models/Candidate');

    const job = await Job.findById(jobId);
    if (!job || job.status !== 'open') {
      return res.status(400).json({ error: 'Job not available' });
    }

    const existing = await Application.findOne({ candidate: req.user.id, job: jobId });
    if (existing) {
      return res.status(409).json({ error: 'You already applied to this job' });
    }

    // Get candidate profile for skill matching
    const candidate = await Candidate.findById(req.user.id);
    const candidateSkills = candidate?.profile?.skills || [];
    
    // Calculate skill matching
    const { matchedSkills, skillsMatch } = calculateSkillMatch(candidateSkills, job.skillsRequired || []);

    const application = await Application.create({
      candidate: req.user.id,
      job: jobId,
      recruiter: job.postedBy,
      appliedAt: new Date(),
      matchedSkills,
      skillsMatch,
      experienceMatch: candidate?.workStatus === 'experienced',
    });

    // Gamification (non-fatal if either fails)
    try {
      await checkFirstApplicationBadge(req.user.id);
      await updateApplicationStreak(req.user.id);
    } catch (gamErr) {
      console.error('Gamification update failed:', gamErr.message);
    }

    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/applications/mine (candidate only)
exports.myApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate({
        path: 'job',
        select: 'title description location salary experienceLevel skillsRequired postedBy',
        populate: {
          path: 'postedBy',
          select: 'companyName companyLogoUrl rating'
        }
      })
      .sort({ appliedAt: -1 });
    
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/applications/recruiter (recruiter only)
exports.applicantsForRecruiter = async (req, res) => {
  try {
    const applications = await Application.find({ recruiter: req.user.id })
      .populate({
        path: 'candidate',
        select: '-passwordHash -phone',
      })
      .populate({
        path: 'job',
        select: 'title description location salary experienceLevel skillsRequired postedBy',
        populate: {
          path: 'postedBy',
          select: 'companyName companyLogoUrlUrl rating'
        }
      })
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/applications/job/:jobId (recruiter only) - Section 5, recruiter dashboard
exports.applicantsForJob = async (req, res) => {
  try {
    const applications = await Application.find({
      job: req.params.jobId,
      recruiter: req.user.id,
    })
      .populate({
        path: 'candidate',
        select: '-passwordHash -phone',
      })
      .populate({
        path: 'job',
        select: 'title description location salary experienceLevel skillsRequired postedBy',
        populate: {
          path: 'postedBy',
          select: 'companyName companyLogoUrl rating'
        }
      })
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/applications/job/:jobId (candidate only) — withdraw own application
exports.withdraw = async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
      candidate: req.user.id,
      job: req.params.jobId,
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// PATCH /api/applications/:id/status (recruiter only)
exports.updateStatus = async (req, res) => {
  try {
    let { status, interviewDate, interviewTime } = req.body; // interviewDate and interviewTime are optional for interview scheduling

    if (status === 'interview') {
      status = 'interview_scheduled';
    }

    // Build update object with status and timeline dates
    const updateObj = { status };
    
    switch (status) {
      case 'viewed':
        if (!updateObj.viewedAt) updateObj.viewedAt = new Date();
        break;
      case 'shortlisted':
        updateObj.resumeViewedAt = new Date();
        break;
      case 'interview_scheduled':
        updateObj.interviewScheduledAt = new Date();
        if (interviewDate) updateObj.interviewDate = interviewDate;
        if (interviewTime) updateObj.interviewTime = interviewTime;
        break;
      case 'offered':
        updateObj.offeredAt = new Date();
        break;
      case 'accepted':
        updateObj.acceptedAt = new Date();
        break;
    }

    const application = await Application.findOne({
      _id: req.params.id,
      recruiter: req.user.id,
    })
      .populate({ path: 'candidate', select: 'name email' })
      .populate({ path: 'job', select: 'title' });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const recruiter = await Recruiter.findById(req.user.id).select('name companyName');

    const updatedApplication = await Application.findOneAndUpdate(
      { _id: req.params.id, recruiter: req.user.id },
      updateObj,
      { new: true }
    ).populate({ path: 'candidate', select: 'name email' }).populate({ path: 'job', select: 'title' });

    const emailStatus = {
      shortlisted: null,
      interviewScheduled: null,
      rejected: null,
    };

    if (status === 'shortlisted') {
      try {
        const candidateEmail = application.candidate?.email;
        const candidateName = application.candidate?.name;
        const jobTitle = application.job?.title;

        if (!candidateEmail) {
          console.error('Shortlist email failed: Candidate email is missing');
          emailStatus.shortlisted = false;
        } else {
          const result = await sendShortlistEmail(
            candidateEmail,
            candidateName,
            jobTitle,
            recruiter?.name || 'Hiring Team',
            recruiter?.companyName || 'Our Company'
          );
          emailStatus.shortlisted = result?.sent ?? false;
          console.log(`Shortlist email status: ${emailStatus.shortlisted} for ${candidateEmail}`);
        }
      } catch (emailErr) {
        console.error('Shortlist email failed:', emailErr.message);
        emailStatus.shortlisted = false;
      }
    }

    if (status === 'interview_scheduled') {
      try {
        const candidateEmail = application.candidate?.email;
        const candidateName = application.candidate?.name;
        const jobTitle = application.job?.title;

        if (!candidateEmail) {
          console.error('Interview schedule email failed: Candidate email is missing');
          emailStatus.interviewScheduled = false;
        } else {
          const result = await sendInterviewScheduleEmail(
            candidateEmail,
            candidateName,
            jobTitle,
            recruiter?.name || 'Hiring Team',
            recruiter?.companyName || 'Our Company',
            interviewDate,
            interviewTime
          );
          emailStatus.interviewScheduled = result?.sent ?? false;
          console.log(`Interview schedule email status: ${emailStatus.interviewScheduled} for ${candidateEmail}`);
        }
      } catch (emailErr) {
        console.error('Interview schedule email failed:', emailErr.message);
        emailStatus.interviewScheduled = false;
      }
    }

    if (status === 'rejected') {
      try {
        const candidateEmail = application.candidate?.email;
        const candidateName = application.candidate?.name;
        const jobTitle = application.job?.title;

        if (!candidateEmail) {
          console.error('Rejection email failed: Candidate email is missing');
          emailStatus.rejected = false;
        } else {
          const result = await sendRejectionEmail(
            candidateEmail,
            candidateName,
            jobTitle,
            recruiter?.name || 'Hiring Team',
            recruiter?.companyName || 'Our Company'
          );
          emailStatus.rejected = result?.sent ?? false;
          console.log(`Rejection email status: ${emailStatus.rejected} for ${candidateEmail}`);
        }
      } catch (emailErr) {
        console.error('Rejection email failed:', emailErr.message);
        emailStatus.rejected = false;
      }
    }

    try {
      await createNotification({
        candidate: application.candidate,
        type: 'application_status',
        title: 'Application update',
        message: `Your application for "${application.job?.title || 'a job'}" is now ${status}.`,
        relatedId: application._id,
      });
    } catch (notifErr) {
      console.error('Notification creation failed:', notifErr.message);
    }

    res.json({
      application: updatedApplication,
      emailStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/applications/:id/view (recruiter only) - Track when recruiter views an applicant
exports.trackView = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      recruiter: req.user.id,
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Increment view count
    const updateObj = { $inc: { viewsCount: 1 } };

    // Set viewedAt if not already set (first view)
    if (!application.viewedAt) {
      updateObj.viewedAt = new Date();
    }

    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true }
    ).populate('job', 'title');

    res.json(updatedApplication);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
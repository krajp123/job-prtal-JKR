const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Application = require('../models/Application');
const JobReopenRequest = require('../models/JobReopenRequest');
const pdfParse = require('pdf-parse');
const sanitizeHtml = require('sanitize-html');
const { sendEmail } = require('../services/email.service');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Only the formatting the RichTextField toolbar can actually produce
// (bold/italic/underline + bulleted/numbered lists) is allowed through.
// Everything else (script tags, style attrs, event handlers, etc.) is stripped.
const RICH_TEXT_SANITIZE_OPTIONS = {
  allowedTags: ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

function sanitizeDescriptionSections(sections) {
  if (!sections || typeof sections !== 'object') return undefined;

  const clean = {};
  for (const [heading, html] of Object.entries(sections)) {
    const safeHtml = sanitizeHtml(String(html || ''), RICH_TEXT_SANITIZE_OPTIONS).trim();
    if (safeHtml) clean[String(heading).slice(0, 80)] = safeHtml;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'we',
  'will',
  'with',
  'you',
  'your',
  'years',
  'experience',
  'skill',
  'skills',
  'job',
  'role',
  'candidate',
  'responsibilities',
  'requirements',
]);

function normalizeKeyword(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywordsFromText(text, limit = 24) {
  const counts = new Map();
  const tokens = normalizeKeyword(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && token.length >= 3 && !STOP_WORDS.has(token));

  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

function collectJobKeywords(job) {
  const rawKeywords = [
    job.title,
    job.location,
    job.experienceLevel,
    ...(Array.isArray(job.skillsRequired) ? job.skillsRequired : []),
    job.description,
  ]
    .filter(Boolean)
    .flatMap((value) => normalizeKeyword(value).split(' '));

  return new Set(rawKeywords.filter((token) => token && token.length >= 3 && !STOP_WORDS.has(token)));
}

// POST /api/jobs (recruiter only)
exports.create = async (req, res) => {
  try {
    const { title, description, location, salary, skillsRequired, experienceLevel, descriptionSections } = req.body;

    const job = await Job.create({
      title,
      description,
      descriptionSections: sanitizeDescriptionSections(descriptionSections),
      location,
      salary,
      skillsRequired,
      experienceLevel,
      postedBy: req.user.id,
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs (public listing with search/filter)
exports.list = async (req, res) => {
  try {
    const { skill, location, experienceLevel } = req.query;
    const query = { status: 'open' };

    if (skill) query.skillsRequired = { $regex: skill, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (experienceLevel) query.experienceLevel = experienceLevel;

    const jobs = await Job.find(query).populate('postedBy', 'companyName companyLogoUrl');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/recommended (candidate only)
exports.recommended = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select('profile.skills').lean();
    const skills = (candidate?.profile?.skills || []).filter(Boolean);
    const query = { status: 'open' };

    if (skills.length > 0) {
      query.skillsRequired = { $in: skills.map((skill) => new RegExp(escapeRegex(skill), 'i')) };
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('postedBy', 'companyName companyLogoUrl');

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jobs/analyze-resume (candidate only)
exports.analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a resume PDF.' });
    }

    const candidate = await Candidate.findById(req.user.id).select('profile.skills').lean();
    const resumeParse = await pdfParse(req.file.buffer);
    const resumeText = resumeParse.text || '';
    const candidateSkills = Array.isArray(candidate?.profile?.skills) ? candidate.profile.skills : [];
    const extractedKeywords = extractKeywordsFromText(`${resumeText}\n${candidateSkills.join(' ')}`);

    const jobs = await Job.find({ status: 'open' })
      .populate('postedBy', 'companyName companyLogoUrl')
      .sort({ createdAt: -1 })
      .lean();

    const matchedJobs = jobs
      .map((job) => {
        const jobKeywords = collectJobKeywords(job);
        const matchedKeywords = extractedKeywords.filter((keyword) => {
          const normalizedKeyword = normalizeKeyword(keyword);
          return [...jobKeywords].some((jobKeyword) => {
            return jobKeyword.includes(normalizedKeyword) || normalizedKeyword.includes(jobKeyword);
          });
        });

        return {
          ...job,
          matchedKeywords,
          matchScore: matchedKeywords.length,
        };
      })
      .filter((job) => job.matchScore > 0)
      .sort((first, second) => second.matchScore - first.matchScore || second.createdAt - first.createdAt)
      .slice(0, 10);

    res.json({
      keywords: extractedKeywords,
      matchedJobs,
      summary:
        matchedJobs.length > 0
          ? `I found ${matchedJobs.length} job${matchedJobs.length === 1 ? '' : 's'} that match your resume.`
          : 'I could not find a strong match yet. Try uploading a more complete resume or add more skills to your profile.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not analyze the resume.' });
  }
};

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

exports.resumeContact = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const adminEmail = process.env.EMAIL_USER || 'admin@example.com';
    await sendEmail({
      to: adminEmail,
      subject: 'Candidate resume match request',
      body: `The candidate provided the email ${email} after no matching jobs were found. Please follow up when a suitable role is available.`,
    });

    res.json({ message: 'Thank you. We will contact you when a suitable job opens up.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not submit your contact request.' });
  }
};

// GET /api/companies/top
exports.topCompanies = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' }).select('postedBy').populate('postedBy', 'companyName');
    const companies = new Map();

    for (const job of jobs) {
      const recruiter = job.postedBy;
      if (!recruiter?._id) continue;

      const id = String(recruiter._id);
      const company = companies.get(id) || {
        _id: recruiter._id,
        name: recruiter.companyName || 'Company',
        openJobs: 0,
      };

      company.openJobs += 1;
      companies.set(id, company);
    }

    const topCompanies = [...companies.values()]
      .sort((first, second) => second.openJobs - first.openJobs)
      .slice(0, 12);

    res.json(topCompanies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/mine (recruiter only)
exports.myJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 }).lean();

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        applicantsCount: await Application.countDocuments({ job: job._id }),
      }))
    );

    res.json(jobsWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/jobs/:id (recruiter only)
exports.update = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'descriptionSections', 'location', 'salary', 'skillsRequired', 'experienceLevel'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'skillsRequired') {
          updates[field] = Array.isArray(req.body[field])
            ? req.body[field].map((value) => String(value).trim()).filter(Boolean)
            : String(req.body[field])
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
        } else if (field === 'descriptionSections') {
          updates[field] = sanitizeDescriptionSections(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields were provided to update.' });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user.id },
      updates,
      { new: true }
    );

    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/jobs/:id (recruiter only)
exports.remove = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/:id
exports.getById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'companyName companyLogoUrl');
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const applicantsCount = await Application.countDocuments({ job: job._id });

    res.json({ ...job.toObject(), applicantsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/jobs/:id/close (recruiter only)
exports.closeJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const nextStatus = req.body?.status === 'open' ? 'open' : 'closed';
    if (nextStatus === 'open' && job.adminClosed) {
      return res.status(403).json({
        error: 'This job was closed by an admin and cannot be reopened directly. Submit a reopen request instead.',
      });
    }

    job.status = nextStatus;
    await job.save();
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jobs/:id/reopen-request (recruiter only)
exports.requestReopen = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'closed' || !job.adminClosed) {
      return res.status(400).json({ error: 'This job is not locked by an admin closure.' });
    }

    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Please provide a reason for reopening the job.' });
    }

    const existingRequest = await JobReopenRequest.findOne({ job: job._id, recruiter: req.user.id, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending reopen request for this job.' });
    }

    const request = await JobReopenRequest.create({
      job: job._id,
      recruiter: req.user.id,
      message,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
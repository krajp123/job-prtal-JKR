const Candidate = require('../models/Candidate');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { isValidEmail, isValidPhone } = require('../utils/validators');
const { setOtp, checkOtp, clearOtp } = require('../services/verificationStore.service');
const { sendEmail } = require('../services/email.service');
const { twilioClient, TWILIO_PHONE_NUMBER } = require('../config/twilio');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { r2Client, BUCKET_NAME, PUBLIC_URL } = require('../config/cloudflareR2');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

function isValidUrl(value) {
  if (!value) return true; // empty/optional is fine
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function uploadBufferToCloudinary(buffer, folder, publicId, resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

function getLocalUploadUrl(req, relativePath) {
  return `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
}

// GET /api/candidate/me
exports.getMyProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select('-passwordHash');
    if (!candidate) return res.status(401).json({ error: 'Candidate account not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/candidate/me
exports.deleteMyAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Please enter your password to confirm account deletion.' });
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Please select a reason for deleting your account.' });
    }

    const candidate = await Candidate.findById(req.user.id).select(
      'passwordHash profile.profilePictureUrl profile.resumeUrl'
    );
    if (!candidate) return res.status(401).json({ error: 'Candidate account not found' });

    const isMatch = await comparePassword(password, candidate.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    const urlsToDelete = [candidate.profile?.profilePictureUrl, candidate.profile?.resumeUrl].filter(Boolean);
    for (const fileUrl of urlsToDelete) {
      if (fileUrl.startsWith(PUBLIC_URL) && r2Client) {
        const key = fileUrl.slice(PUBLIC_URL.length + 1).replace(/^\//, '');
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            })
          );
        } catch (deleteErr) {
          console.warn('Unable to delete candidate file from R2:', deleteErr.message);
        }
      }
      if (fileUrl.includes('/uploads/')) {
        const relativePath = fileUrl.split('/uploads/')[1] || '';
        if (relativePath) {
          const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
          fs.promises.unlink(localPath).catch(() => {});
        }
      }
    }

    console.log(`[Account deletion] Candidate ${req.user.id} deleted their account. Reason: ${reason.trim()}`);

    await Promise.all([
      Application.deleteMany({ candidate: req.user.id }),
      Notification.deleteMany({ candidate: req.user.id }),
    ]);

    await Candidate.deleteOne({ _id: req.user.id });

    res.json({ message: 'Candidate account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/candidate/me
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email, phone, skills, experience, education, socialLinks, visibility } = req.body;

    const currentCandidate = await Candidate.findById(req.user.id).select('email phone');
    if (!currentCandidate) {
      return res.status(401).json({ error: 'Candidate account not found' });
    }

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      const existingEmail = await Candidate.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already in use' });
      }
    }

    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      const existingPhone = await Candidate.findOne({ phone, _id: { $ne: req.user.id } });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number is already in use' });
      }
    }

    if (visibility && !['public', 'private', 'applied', 'hidden'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value' });
    }
    if (socialLinks) {
      for (const field of ['github', 'linkedin', 'website']) {
        if (socialLinks[field] && !isValidUrl(socialLinks[field])) {
          return res.status(400).json({ error: `Invalid URL for ${field}` });
        }
      }
    }

    const update = {};
    if (skills !== undefined) update['profile.skills'] = skills;
    if (experience !== undefined) update['profile.experience'] = experience;
    if (education !== undefined) update['profile.education'] = education;
    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) {
      update.email = email.toLowerCase();
      if (email.toLowerCase() !== currentCandidate.email) {
        update.emailVerified = false;
      }
    }
    if (phone !== undefined) {
      update.phone = phone;
      if (phone !== currentCandidate.phone) {
        update.phoneVerified = false;
      }
    }
    if (socialLinks) update.socialLinks = socialLinks;
    if (visibility !== undefined) update.visibility = visibility;

    const candidate = await Candidate.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      '-passwordHash'
    );

    // Gamification: unlock "Profile Complete" badge once the essentials are filled in.
    // eslint-disable-next-line global-require
    const { checkProfileCompleteBadge } = require('../services/badge.service');
    await checkProfileCompleteBadge(candidate);

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    const candidate = await Candidate.findById(req.user.id).select('passwordHash');
    if (!candidate) {
      return res.status(401).json({ error: 'Candidate account not found' });
    }
    const isMatch = await comparePassword(currentPassword, candidate.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is the same as current password
    const isSameAsCurrentPassword = await comparePassword(newPassword, candidate.passwordHash);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password. Please choose a different password.' });
    }

    candidate.passwordHash = await hashPassword(newPassword);
    await candidate.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function getPendingChangeKey(type, candidateId, value) {
  return `candidate:update:${type}:${candidateId}:${String(value).toLowerCase()}`;
}

exports.sendEmailChangeOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existingEmail = await Candidate.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const candidate = await Candidate.findById(req.user.id).select('email');
    if (!candidate) {
      return res.status(401).json({ error: 'Candidate account not found' });
    }
    if (candidate.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'This is already your registered email' });
    }

    const key = getPendingChangeKey('email', req.user.id, email);
    const code = setOtp(key);

    await sendEmail({
      to: email,
      subject: 'Verify your new Job Portal email',
      body: `Your verification code is ${code}. It expires in 5 minutes.`,
    });

    res.json({ message: 'Verification code sent to the new email address' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEmailChangeOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const key = getPendingChangeKey('email', req.user.id, email);
    if (!checkOtp(key, code)) {
      return res.status(400).json({ error: 'Incorrect or expired verification code' });
    }

    clearOtp(key);

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { email: email.toLowerCase(), emailVerified: true },
      { new: true }
    ).select('-passwordHash');

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendPhoneChangeOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const existingPhone = await Candidate.findOne({ phone, _id: { $ne: req.user.id } });
    if (existingPhone) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const candidate = await Candidate.findById(req.user.id).select('phone');
    if (!candidate) {
      return res.status(401).json({ error: 'Candidate account not found' });
    }
    if (candidate.phone === phone) {
      return res.status(400).json({ error: 'This is already your registered phone number' });
    }

    const key = getPendingChangeKey('phone', req.user.id, phone);
    const code = setOtp(key);

    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      return res.json({ message: `Verification code sent in dev mode: ${code}` });
    }

    await twilioClient.messages.create({
      body: `Your Job Portal verification code is ${code}. It expires in 5 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.json({ message: 'Verification code sent to the new phone number' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyPhoneChangeOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required' });
    }

    const key = getPendingChangeKey('phone', req.user.id, phone);
    if (!checkOtp(key, code)) {
      return res.status(400).json({ error: 'Incorrect or expired verification code' });
    }

    clearOtp(key);

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { phone, phoneVerified: true },
      { new: true }
    ).select('-passwordHash');

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMyPreferences = async (req, res) => {
  try {
    const {
      preferredRoles,
      preferredLocations,
      preferredSkills,
      minSalary,
      maxSalary,
      noticePeriod,
      alertFrequency,
    } = req.body;

    const update = {};
    if (preferredRoles !== undefined) {
      if (!Array.isArray(preferredRoles)) {
        return res.status(400).json({ error: 'Preferred roles must be an array' });
      }
      update['profile.preferredRoles'] = preferredRoles.map((item) => String(item).trim()).filter(Boolean);
    }
    if (preferredLocations !== undefined) {
      if (!Array.isArray(preferredLocations)) {
        return res.status(400).json({ error: 'Preferred locations must be an array' });
      }
      update['profile.preferredLocations'] = preferredLocations.map((item) => String(item).trim()).filter(Boolean);
    }
    if (preferredSkills !== undefined) {
      if (!Array.isArray(preferredSkills)) {
        return res.status(400).json({ error: 'Preferred skills must be an array' });
      }
      update['profile.preferredSkills'] = preferredSkills.map((item) => String(item).trim()).filter(Boolean);
    }
    if (minSalary !== undefined) update['profile.preferredMinSalary'] = String(minSalary).trim();
    if (maxSalary !== undefined) update['profile.preferredMaxSalary'] = String(maxSalary).trim();
    if (noticePeriod !== undefined) update['profile.preferredNoticePeriod'] = String(noticePeriod).trim();
    if (alertFrequency !== undefined) {
      const validFrequencies = ['instant', 'daily', 'weekly', 'off'];
      if (!validFrequencies.includes(alertFrequency)) {
        return res.status(400).json({ error: 'Invalid alert frequency' });
      }
      update['profile.alertFrequency'] = alertFrequency;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No preferences provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const {
      jobRecommendations,
      applicationUpdates,
      recruiterMessages,
      marketing,
      smsReminders,
      push,
    } = req.body;

    const update = {};
    if (jobRecommendations !== undefined) update['notificationPreferences.jobRecommendations'] = Boolean(jobRecommendations);
    if (applicationUpdates !== undefined) update['notificationPreferences.applicationUpdates'] = Boolean(applicationUpdates);
    if (recruiterMessages !== undefined) update['notificationPreferences.recruiterMessages'] = Boolean(recruiterMessages);
    if (marketing !== undefined) update['notificationPreferences.marketing'] = Boolean(marketing);
    if (smsReminders !== undefined) update['notificationPreferences.smsReminders'] = Boolean(smsReminders);
    if (push !== undefined) update['notificationPreferences.push'] = Boolean(push);

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No notification preferences provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSecuritySettings = async (req, res) => {
  try {
    const { twoFactorEnabled } = req.body;
    if (twoFactorEnabled === undefined) {
      return res.status(400).json({ error: 'No security settings provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { twoFactorEnabled: Boolean(twoFactorEnabled) },
      { new: true }
    ).select('-passwordHash');

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const { visibility, searchable, hiddenCompanies } = req.body;
    const update = {};

    if (visibility !== undefined) {
      if (!['public', 'private', 'applied', 'hidden'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility value' });
      }
      update.visibility = visibility;
    }

    if (searchable !== undefined) {
      update.searchable = Boolean(searchable);
    }

    if (hiddenCompanies !== undefined) {
      if (!Array.isArray(hiddenCompanies)) {
        return res.status(400).json({ error: 'Hidden companies must be an array' });
      }
      update.hiddenCompanies = hiddenCompanies.map((item) => String(item).trim()).filter(Boolean);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No privacy settings provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      headline,
      about,
      location,
      phone,
      skills,
      languages,
      workPreferences,
      availability,
    } = req.body;

    const update = {};

    if (headline !== undefined) update['profile.headline'] = String(headline).trim();
    if (about !== undefined) update['profile.about'] = String(about).trim();
    if (location !== undefined) update['profile.location'] = String(location).trim();
    if (phone !== undefined) update['profile.phone'] = String(phone).trim();
    if (workPreferences !== undefined) update['profile.workPreferences'] = String(workPreferences).trim();
    if (availability !== undefined) update['profile.availability'] = String(availability).trim();

    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ error: 'Skills must be an array' });
      }
      update['profile.skills'] = skills.map((item) => String(item).trim()).filter(Boolean);
    }

    if (languages !== undefined) {
      if (!Array.isArray(languages)) {
        return res.status(400).json({ error: 'Languages must be an array' });
      }
      update['profile.languages'] = languages.map((item) => String(item).trim()).filter(Boolean);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid profile fields provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      '-passwordHash'
    );

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfileSocial = async (req, res) => {
  try {
    const { github, linkedin, website } = req.body;
    const socialLinks = {};

    if (github !== undefined) {
      if (github && !isValidUrl(github)) return res.status(400).json({ error: 'Invalid URL for github' });
      socialLinks.github = github ? String(github).trim() : '';
    }
    if (linkedin !== undefined) {
      if (linkedin && !isValidUrl(linkedin)) return res.status(400).json({ error: 'Invalid URL for linkedin' });
      socialLinks.linkedin = linkedin ? String(linkedin).trim() : '';
    }
    if (website !== undefined) {
      if (website && !isValidUrl(website)) return res.status(400).json({ error: 'Invalid URL for website' });
      socialLinks.website = website ? String(website).trim() : '';
    }

    if (Object.keys(socialLinks).length === 0) {
      return res.status(400).json({ error: 'No social links provided' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { socialLinks },
      { new: true }
    ).select('-passwordHash');

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function updateSubarrayField(req, res, bodyKey, schemaPath) {
  try {
    const items = req.body[bodyKey];
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: `${bodyKey} must be an array` });
    }

    return Candidate.findByIdAndUpdate(
      req.user.id,
      { [schemaPath]: items },
      { new: true }
    )
      .select('-passwordHash')
      .then((candidate) => res.json(candidate))
      .catch((err) => res.status(500).json({ error: err.message }));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function ensureLocalUploadFolder(...segments) {
  const folder = path.join(__dirname, '..', '..', 'uploads', ...segments);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  return folder;
}

exports.updateProfileExperience = async (req, res) => {
  return updateSubarrayField(req, res, 'experience', 'profile.experience');
};

exports.updateProfileEducation = async (req, res) => {
  return updateSubarrayField(req, res, 'education', 'profile.education');
};

exports.updateProfileCertifications = async (req, res) => {
  return updateSubarrayField(req, res, 'certifications', 'profile.certifications');
};

exports.updateProfileProjects = async (req, res) => {
  return updateSubarrayField(req, res, 'projects', 'profile.projects');
};

exports.updateProfilePortfolio = async (req, res) => {
  return updateSubarrayField(req, res, 'portfolio', 'profile.portfolio');
};

// POST /api/candidate/me/resume (multipart, field name "resume") - PDF only, 10MB max (enforced by multer)
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let resumeUrl;
    if (r2Client && BUCKET_NAME && PUBLIC_URL) {
      const key = `resumes/${req.user.id}-${Date.now()}-${req.file.originalname}`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      resumeUrl = `${PUBLIC_URL}/${key}`;
    } else if (isCloudinaryConfigured) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        'resumes',
        `${req.user.id}-${Date.now()}`,
        'raw'
      );
      resumeUrl = result.secure_url;
    } else {
      const uploadsFolder = ensureLocalUploadFolder('resumes');
      const fileName = `${req.user.id}-${Date.now()}-${path.basename(req.file.originalname)}`;
      const filePath = path.join(uploadsFolder, fileName);
      await fs.promises.writeFile(filePath, req.file.buffer);
      resumeUrl = getLocalUploadUrl(req, `resumes/${fileName}`);
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      {
        'profile.resumeUrl': resumeUrl,
        'profile.resumeFilename': req.file.originalname,
      },
      { new: true }
    ).select('-passwordHash');

    res.json({ resumeUrl, candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/candidate/me/saved-jobs
exports.getSavedJobs = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).populate({
      path: 'savedJobs',
      populate: { path: 'postedBy', select: 'companyName companyLogoUrl' },
    });
    res.json(candidate.savedJobs || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/me/saved-jobs/:jobId
exports.saveJob = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { savedJobs: req.params.jobId } },
      { new: true }
    ).select('savedJobs');
    res.json({ savedJobs: candidate.savedJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/candidate/me/saved-jobs/:jobId
exports.unsaveJob = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { $pull: { savedJobs: req.params.jobId } },
      { new: true }
    ).select('savedJobs');
    res.json({ savedJobs: candidate.savedJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/me/profile-picture (multipart, field name "photo") - image only, 5MB max
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let profilePictureUrl;
    if (r2Client && BUCKET_NAME && PUBLIC_URL) {
      const key = `profile-pictures/${req.user.id}-${Date.now()}-${req.file.originalname}`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      profilePictureUrl = `${PUBLIC_URL}/${key}`;
    } else if (isCloudinaryConfigured) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        'profile-pictures',
        `${req.user.id}-${Date.now()}`,
        'image'
      );
      profilePictureUrl = result.secure_url;
    } else {
      const uploadsFolder = ensureLocalUploadFolder('profile-pictures');
      const fileName = `${req.user.id}-${Date.now()}-${path.basename(req.file.originalname)}`;
      const filePath = path.join(uploadsFolder, fileName);
      await fs.promises.writeFile(filePath, req.file.buffer);
      profilePictureUrl = getLocalUploadUrl(req, `profile-pictures/${fileName}`);
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { 'profile.profilePictureUrl': profilePictureUrl },
      { new: true }
    ).select('-passwordHash');

    res.json({ profilePictureUrl, candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/candidate/me/photo - remove candidate profile photo URL
exports.deleteProfilePicture = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select('profile.profilePictureUrl');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const currentUrl = candidate.profile?.profilePictureUrl || '';
    if (currentUrl && PUBLIC_URL && currentUrl.startsWith(PUBLIC_URL)) {
      const key = currentUrl.slice(PUBLIC_URL.length + 1).replace(/^\//, '');
      if (r2Client) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            })
          );
        } catch (deleteErr) {
          // ignore deletion failures, but still clear the profile URL
          console.warn('Unable to delete profile photo from R2:', deleteErr.message);
        }
      }
    }

    if (currentUrl && currentUrl.includes('/uploads/')) {
      const relativePath = currentUrl.split('/uploads/')[1] || '';
      if (relativePath) {
        const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
        fs.promises.unlink(localPath).catch(() => {});
      }
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { 'profile.profilePictureUrl': '' },
      { new: true }
    ).select('-passwordHash');

    res.json({ candidate: updatedCandidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/candidate/me/resume - remove candidate resume URL
exports.deleteResume = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select('profile.resumeUrl');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const currentUrl = candidate.profile?.resumeUrl || '';
    if (currentUrl && PUBLIC_URL && currentUrl.startsWith(PUBLIC_URL)) {
      const key = currentUrl.slice(PUBLIC_URL.length + 1).replace(/^\//, '');
      if (r2Client) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            })
          );
        } catch (deleteErr) {
          console.warn('Unable to delete resume from R2:', deleteErr.message);
        }
      }
    }

    if (currentUrl && currentUrl.includes('/uploads/')) {
      const relativePath = currentUrl.split('/uploads/')[1] || '';
      if (relativePath) {
        const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
        fs.promises.unlink(localPath).catch(() => {});
      }
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.user.id,
      { 'profile.resumeUrl': '', 'profile.resumeFilename': '' },
      { new: true }
    ).select('-passwordHash');

    res.json({ candidate: updatedCandidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/profile/resume/download - fetch and stream candidate resume with correct headers
exports.downloadResume = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select('profile.resumeUrl profile.resumeFilename');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const resumeUrl = candidate.profile?.resumeUrl;
    if (!resumeUrl) return res.status(404).json({ error: 'No resume found' });

    let fileName = candidate.profile?.resumeFilename || '';
    if (!fileName) {
      fileName = decodeURIComponent(resumeUrl.split('/').pop()?.split('?')[0] || 'resume.pdf');
    }
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName = `${fileName}.pdf`;
    }

    if (resumeUrl.includes('/uploads/')) {
      const relativePath = resumeUrl.split('/uploads/')[1] || '';
      const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
      return res.download(localPath, fileName, (err) => {
        if (err) {
          console.error('Failed to download local resume:', err);
          return res.status(404).json({ error: 'Resume not available' });
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
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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

// GET /api/candidate/:uniqueId - used by recruiters for referral lookups (Section 5.5)
exports.getByUniqueId = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ uniqueId: req.params.uniqueId }).select(
      '-passwordHash -phone'
    );
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/candidate/search - full search for recruiters
exports.search = async (req, res) => {
  try {
    const { skill, location } = req.query;
    const query = { visibility: { $ne: 'private' } };
    if (skill) query['profile.skills'] = { $regex: skill, $options: 'i' };

    const results = await Candidate.find(query)
      .select('-passwordHash -phone')
      .limit(50);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
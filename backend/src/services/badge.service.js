const Candidate = require('../models/Candidate');
const Application = require('../models/Application');

// Called once the recruiter uploads the signed acceptance letter.
// Confirms the signed copy, flips the application to "hired", and turns on the badge.
async function confirmHiredBadge({ applicationId, signedAcceptanceUrl }) {
  const application = await Application.findById(applicationId);
  if (!application) throw new Error('Application not found');

  application.status = 'hired';
  await application.save();

  const candidate = await Candidate.findByIdAndUpdate(
    application.candidate,
    {
      hiredBadge: {
        isHired: true,
        applicationId: application._id,
        confirmedAt: new Date(),
      },
    },
    { new: true }
  );

  return candidate;
}

// --- Gamification: generic badges + streaks -------------------------------

async function awardBadgeIfMissing(candidateId, key, label) {
  const candidate = await Candidate.findById(candidateId).select('gamification.badges');
  if (!candidate) return;

  const alreadyHas = (candidate.gamification?.badges || []).some((b) => b.key === key);
  if (alreadyHas) return;

  await Candidate.findByIdAndUpdate(candidateId, {
    $push: { 'gamification.badges': { key, label, unlockedAt: new Date() } },
  });
}

// Call after a profile update. Unlocks "Profile Complete" once skills,
// at least one experience/education entry, and a resume are all present.
async function checkProfileCompleteBadge(candidate) {
  if (!candidate) return;
  const hasSkills = (candidate.profile?.skills || []).length > 0;
  const hasExperienceOrEducation =
    (candidate.profile?.experience || []).length > 0 || (candidate.profile?.education || []).length > 0;
  const hasResume = Boolean(candidate.profile?.resumeUrl);

  if (hasSkills && hasExperienceOrEducation && hasResume) {
    await awardBadgeIfMissing(candidate._id, 'profile_complete', 'Profile Complete');
  }
}

// Call after a candidate's first successful application.
async function checkFirstApplicationBadge(candidateId) {
  const count = await Application.countDocuments({ candidate: candidateId });
  if (count === 1) {
    await awardBadgeIfMissing(candidateId, 'first_application', 'First Application');
  }
}

// Call on every successful login. Tracks a simple day-over-day streak.
async function updateLoginStreak(candidateId) {
  const candidate = await Candidate.findById(candidateId).select('gamification.loginStreak');
  if (!candidate) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = candidate.gamification?.loginStreak?.lastLoginDate
    ? new Date(candidate.gamification.loginStreak.lastLoginDate)
    : null;
  const lastDay = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate()) : null;

  let newCount = 1;
  if (lastDay) {
    const diffDays = Math.round((today - lastDay) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      newCount = candidate.gamification?.loginStreak?.count || 1; // already logged in today
    } else if (diffDays === 1) {
      newCount = (candidate.gamification?.loginStreak?.count || 0) + 1; // consecutive day
    } else {
      newCount = 1; // streak broken, restart
    }
  }

  await Candidate.findByIdAndUpdate(candidateId, {
    'gamification.loginStreak.count': newCount,
    'gamification.loginStreak.lastLoginDate': now,
  });
}

// Call on every successful application. Tracks a simple week-over-week streak
// (has the candidate applied to at least one job in this calendar week?).
async function updateApplicationStreak(candidateId) {
  const candidate = await Candidate.findById(candidateId).select('gamification.applicationStreak');
  if (!candidate) return;

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - day);
  currentWeekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = candidate.gamification?.applicationStreak?.weekStart
    ? new Date(candidate.gamification.applicationStreak.weekStart)
    : null;

  let newCount = 1;
  if (prevWeekStart) {
    const diffWeeks = Math.round((currentWeekStart - prevWeekStart) / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks === 0) {
      newCount = candidate.gamification?.applicationStreak?.count || 1; // already applied this week
    } else if (diffWeeks === 1) {
      newCount = (candidate.gamification?.applicationStreak?.count || 0) + 1; // consecutive week
    } else {
      newCount = 1; // streak broken, restart
    }
  }

  await Candidate.findByIdAndUpdate(candidateId, {
    'gamification.applicationStreak.count': newCount,
    'gamification.applicationStreak.weekStart': currentWeekStart,
  });
}

module.exports = {
  confirmHiredBadge,
  checkProfileCompleteBadge,
  checkFirstApplicationBadge,
  updateLoginStreak,
  updateApplicationStreak,
};

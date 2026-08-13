const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

// Suspends any account whose renewalDueDate has passed.
// No data is deleted - renewing at any point restores full access (Section 8).
async function suspendExpiredAccounts() {
  const now = new Date();

  const candidateResult = await Candidate.updateMany(
    { renewalDueDate: { $lt: now }, accountStatus: 'active' },
    { $set: { accountStatus: 'suspended' } }
  );

  const recruiterResult = await Recruiter.updateMany(
    { renewalDueDate: { $lt: now }, accountStatus: 'active' },
    { $set: { accountStatus: 'suspended' } }
  );

  return {
    candidatesSuspended: candidateResult.modifiedCount,
    recruitersSuspended: recruiterResult.modifiedCount,
  };
}

// Returns accounts expiring within the next N days, for the reminder job.
async function findAccountsExpiringSoon(days = 5) {
  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const candidates = await Candidate.find({
    renewalDueDate: { $gte: now, $lte: soon },
    accountStatus: 'active',
  });

  const recruiters = await Recruiter.find({
    renewalDueDate: { $gte: now, $lte: soon },
    accountStatus: 'active',
  });

  return { candidates, recruiters };
}

module.exports = { suspendExpiredAccounts, findAccountsExpiringSoon };

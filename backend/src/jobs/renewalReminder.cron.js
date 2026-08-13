const cron = require('node-cron');
const { findAccountsExpiringSoon } = require('../services/renewal.service');
const { sendEmail } = require('../services/email.service');

// Runs once a day at 8:00 AM server time.
// Sends a reminder a few days before renewalDueDate, per Section 8 of the docs.
function scheduleRenewalReminder() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running renewal reminder job...');

    const { candidates, recruiters } = await findAccountsExpiringSoon(5);

    for (const candidate of candidates) {
      if (candidate.email) {
        await sendEmail({
          to: candidate.email,
          subject: 'Your Job Portal registration is expiring soon',
          body: `Hi ${candidate.name}, your registration expires on ${candidate.renewalDueDate.toDateString()}. Renew to stay active.`,
        });
      }
    }

    for (const recruiter of recruiters) {
      await sendEmail({
        to: recruiter.email,
        subject: 'Your Job Portal registration is expiring soon',
        body: `Hi, your company account expires on ${recruiter.renewalDueDate.toDateString()}. Renew to stay active.`,
      });
    }

    console.log(`[cron] Reminders sent: ${candidates.length} candidates, ${recruiters.length} recruiters`);
  });
}

module.exports = scheduleRenewalReminder;

const cron = require('node-cron');
const { suspendExpiredAccounts } = require('../services/renewal.service');

// Runs once a day at 2:00 AM server time.
// Suspends any account whose renewalDueDate has passed (Section 8: no data deleted).
function scheduleAccountSuspension() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[cron] Running account suspension job...');
    const result = await suspendExpiredAccounts();
    console.log('[cron] Suspension result:', result);
  });
}

module.exports = scheduleAccountSuspension;

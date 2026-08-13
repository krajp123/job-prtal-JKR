const cron = require('node-cron');
const Wallet = require('../models/Wallet');

const WALLET_DATA_RETENTION_DAYS = 30;

async function cleanupExpiredWalletData() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - WALLET_DATA_RETENTION_DAYS);

    const result = await Wallet.updateMany(
      {},
      {
        $pull: {
          transactions: {
            createdAt: { $lt: cutoffDate },
          },
        },
      }
    );

    const wallets = await Wallet.find({});

    for (const wallet of wallets) {
      const validTransactions = (wallet.transactions || []).filter(
        (tx) => new Date(tx.createdAt) >= cutoffDate
      );

      const totalAdded = validTransactions
        .filter((tx) => tx.type === 'recharge' && tx.status === 'success')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const totalSpent = validTransactions
        .filter((tx) => tx.type === 'resume_download' && tx.status === 'success')
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

      let balance = 0;
      for (const tx of validTransactions) {
        if (tx.type === 'recharge' && tx.status === 'success') {
          balance += Number(tx.amount || 0);
        }
        if (tx.type === 'resume_download' && tx.status === 'success') {
          balance -= Math.abs(Number(tx.amount || 0));
        }
      }

      wallet.transactions = validTransactions;
      wallet.totalAdded = totalAdded;
      wallet.totalSpent = totalSpent;
      wallet.resumesDownloaded = validTransactions.filter(
        (tx) => tx.type === 'resume_download' && tx.status === 'success'
      ).length;
      wallet.balance = Math.max(balance, 0);

      await wallet.save();
    }

    console.log(`[cron] Wallet cleanup finished. Removed entries older than ${WALLET_DATA_RETENTION_DAYS} days. Wallets updated: ${wallets.length}.`);
    return {
      updatedWallets: wallets.length,
      removedOlderThanDays: WALLET_DATA_RETENTION_DAYS,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  } catch (error) {
    console.error('[cron] Wallet cleanup failed:', error);
    throw error;
  }
}

function scheduleWalletCleanup() {
  cron.schedule('0 3 * * *', async () => {
    console.log('[cron] Running wallet cleanup job...');
    await cleanupExpiredWalletData();
  });
}

module.exports = { scheduleWalletCleanup, cleanupExpiredWalletData };

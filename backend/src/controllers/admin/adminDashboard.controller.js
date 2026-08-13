const Candidate = require('../../models/Candidate');
const Recruiter = require('../../models/Recruiter');
const Job = require('../../models/Job');
const Payment = require('../../models/Payment');
const Application = require('../../models/Application');

// Helper: Get last N months with month name
function getLastNMonths(n = 6) {
  const months = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString('en-US', { month: 'short' });
    months.push({
      month: monthName,
      year: date.getFullYear(),
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
    });
  }
  return months;
}

// GET /admin-api/dashboard/overview
exports.getOverview = async (req, res) => {
  try {
    const [
      totalCandidates,
      totalRecruiters,
      activeCandidates,
      activeRecruiters,
      totalJobs,
      openJobs,
      totalApplications,
      hiredCount,
      revenueBreakdown,
      totalRevenueAgg,
      signupsTrend,
      jobStatusTrend,
      recentRecruiters,
      recentCandidates,
      recentJobs,
      recentApplications,
    ] = await Promise.all([
      // Current stats
      Candidate.countDocuments(),
      Recruiter.countDocuments(),
      Candidate.countDocuments({ accountStatus: 'active' }),
      Recruiter.countDocuments({ accountStatus: 'active' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'hired' }),
      // Revenue breakdown by purpose
      Payment.aggregate([
        { $match: { status: 'success' } },
        {
          $group: {
            _id: '$purpose',
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Total revenue
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Trends
      getSignupsTrend(),
      getJobStatusTrend(),
      // Recent activity
      Recruiter.find().sort({ createdAt: -1 }).limit(5),
      Candidate.find().sort({ createdAt: -1 }).limit(5),
      Job.find().sort({ createdAt: -1 }).limit(5).populate('postedBy'),
      Application.find().sort({ createdAt: -1 }).limit(5).populate(['candidate', 'job']),
    ]);

    // Format revenue breakdown
    const revenueMap = {};
    revenueBreakdown.forEach((item) => {
      revenueMap[item._id] = { amount: item.amount, count: item.count };
    });

    res.json({
      stats: {
        users: { totalCandidates, totalRecruiters, activeCandidates, activeRecruiters },
        jobs: { totalJobs, openJobs },
        applications: { totalApplications, hiredCount },
        revenue: {
          totalCollected: totalRevenueAgg[0]?.total || 0,
          breakdown: {
            resume_download: revenueMap['resume_download'] || { amount: 0, count: 0 },
            registration: revenueMap['registration'] || { amount: 0, count: 0 },
            renewal: revenueMap['renewal'] || { amount: 0, count: 0 },
            wallet_recharge: revenueMap['wallet_recharge'] || { amount: 0, count: 0 },
          },
        },
      },
      trends: {
        signups: signupsTrend,
        jobStatus: jobStatusTrend,
      },
      recentActivity: {
        recruiters: recentRecruiters,
        candidates: recentCandidates,
        jobs: recentJobs,
        applications: recentApplications,
      },
    });
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Helper: Get signups trend for last 6 months using aggregation
async function getSignupsTrend() {
  const months = getLastNMonths(6);
  
  const candidateAgg = await Candidate.aggregate([
    {
      $match: {
        createdAt: {
          $gte: months[0].start,
          $lte: months[months.length - 1].end,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  const recruiterAgg = await Recruiter.aggregate([
    {
      $match: {
        createdAt: {
          $gte: months[0].start,
          $lte: months[months.length - 1].end,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  // Map aggregation results to month names
  const candMap = {};
  const recruiterMap = {};
  
  candidateAgg.forEach((item) => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    candMap[key] = item.count;
  });

  recruiterAgg.forEach((item) => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    recruiterMap[key] = item.count;
  });

  const trend = months.map((period) => {
    const key = `${period.year}-${String(period.start.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: period.month,
      candidates: candMap[key] || 0,
      recruiters: recruiterMap[key] || 0,
    };
  });

  return trend;
}

// Helper: Get job status trend for last 6 months using aggregation
async function getJobStatusTrend() {
  const months = getLastNMonths(6);

  const jobAgg = await Job.aggregate([
    {
      $match: {
        createdAt: {
          $gte: months[0].start,
          $lte: months[months.length - 1].end,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  // Map to the structure we need
  const jobMap = {};
  jobAgg.forEach((item) => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    if (!jobMap[key]) {
      jobMap[key] = { active: 0, closed: 0, draft: 0 };
    }
    jobMap[key][item._id.status === 'open' ? 'active' : item._id.status] =
      item.count;
  });

  const trend = months.map((period) => {
    const key = `${period.year}-${String(period.start.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: period.month,
      active: jobMap[key]?.active || 0,
      closed: jobMap[key]?.closed || 0,
      draft: jobMap[key]?.draft || 0,
    };
  });

  return trend;
}

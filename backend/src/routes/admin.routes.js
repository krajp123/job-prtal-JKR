const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/auth/adminAuth.controller');
const adminDashboardController = require('../controllers/admin/adminDashboard.controller');
const adminUsersController = require('../controllers/admin/adminUsers.controller');
const adminPaymentsController = require('../controllers/admin/adminPayments.controller');
const adminBadgeController = require('../controllers/admin/adminBadge.controller');
const adminDisputeController = require('../controllers/admin/adminDispute.controller');
const adminJobsController = require('../controllers/admin/adminJobs.controller');

const { requireAdmin, requireSuperAdmin } = require('../middleware/requireAdmin');
const { adminLoginLimiter, adminApiLimiter } = require('../middleware/rateLimiter');

// ---- Auth (public within /admin-api, but rate-limited hard) ----
router.post('/auth/login', adminLoginLimiter, adminAuthController.login);
router.get('/auth/me', requireAdmin, adminAuthController.me);

// Everything below this line requires a valid admin token
router.use(adminApiLimiter, requireAdmin);

// ---- Dashboard ----
router.get('/dashboard/overview', adminDashboardController.getOverview);

// ---- User management ----
router.get('/users/candidates', adminUsersController.listCandidates);
router.get('/users/recruiters', adminUsersController.listRecruiters);
router.patch('/users/candidates/:id/status', adminUsersController.setCandidateStatus);
router.patch('/users/recruiters/:id/status', adminUsersController.setRecruiterStatus);

// ---- Payments monitoring ----
router.get('/payments', adminPaymentsController.listPayments);
router.get('/payments/:id', adminPaymentsController.getPaymentById);

// ---- Hired badge approvals ----
router.get('/badges/pending', adminBadgeController.listPending);
router.patch('/badges/:offerLetterId/approve', adminBadgeController.approve);
router.patch('/badges/:offerLetterId/reject', adminBadgeController.reject);

// ---- Jobs management ----
router.get('/jobs', adminJobsController.listJobs);
router.patch('/jobs/:id/status', adminJobsController.updateJobStatus);
router.delete('/jobs/:id', adminJobsController.deleteJob);
router.get('/applications', adminJobsController.listApplications);
router.get('/jobs/reopen-requests', adminJobsController.listReopenRequests);
router.patch('/jobs/reopen-requests/:id/approve', adminJobsController.approveReopenRequest);
router.patch('/jobs/reopen-requests/:id/reject', adminJobsController.rejectReopenRequest);

// ---- Disputes ----
router.get('/disputes', adminDisputeController.list);
router.get('/disputes/:id', adminDisputeController.getById);
router.patch('/disputes/:id/resolve', adminDisputeController.resolve);

// ---- Superadmin-only example (e.g. creating another admin account, deleting data) ----
// router.post('/admins', requireSuperAdmin, someController.createAnotherAdmin);

module.exports = router;

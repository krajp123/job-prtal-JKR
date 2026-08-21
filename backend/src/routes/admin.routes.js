const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/auth/adminAuth.controller');
const adminDashboardController = require('../controllers/admin/adminDashboard.controller');
const adminUsersController = require('../controllers/admin/adminUsers.controller');
const adminPaymentsController = require('../controllers/admin/adminPayments.controller');
const adminBadgeController = require('../controllers/admin/adminBadge.controller');
const adminDisputeController = require('../controllers/admin/adminDispute.controller');
const adminJobsController = require('../controllers/admin/adminJobs.controller');
const adminManagementController = require('../controllers/admin/adminManagement.controller');
const adminReportsController = require('../controllers/admin/adminReports.controller');
const adminSettingsController = require('../controllers/admin/adminSettings.controller');
const adminPaymentSettingsController = require('../controllers/admin/adminPaymentSettings.controller');
const adminModerationSettingsController = require('../controllers/admin/adminModerationSettings.controller');
const jobModerationController = require('../controllers/jobModeration.controller');

const { requireAdmin, requireSuperAdmin } = require('../middleware/requireAdmin');
const { adminLoginLimiter, adminApiLimiter } = require('../middleware/rateLimiter');
const { uploadProfilePicture } = require('../middleware/uploadHandler');

// ---- Auth (public within /admin-api, but rate-limited hard) ----
router.post('/auth/login', adminLoginLimiter, adminAuthController.login);
router.post('/auth/two-factor/verify', adminLoginLimiter, adminAuthController.verifyTwoFactor);
router.get('/auth/me', requireAdmin, adminAuthController.me);
router.get('/auth/sessions', requireAdmin, adminAuthController.listSessions);
router.delete('/auth/sessions/:sessionId', requireAdmin, adminAuthController.revokeSession);
router.patch('/auth/profile', requireAdmin, adminAuthController.updateProfile);
router.patch('/auth/password', requireAdmin, adminAuthController.changePassword);
router.patch('/auth/two-factor', requireAdmin, adminAuthController.updateTwoFactor);
router.post('/auth/profile-picture', requireAdmin, uploadProfilePicture.single('profilePicture'), adminAuthController.uploadProfilePicture);
router.delete('/auth/profile-picture', requireAdmin, adminAuthController.removeProfilePicture);

// Everything below this line requires a valid admin token
router.use(adminApiLimiter, requireAdmin);

// ---- Admin account management (superadmin only) ----
router.get('/admins', requireSuperAdmin, adminManagementController.list);
router.post('/admins', requireSuperAdmin, adminManagementController.create);
router.patch('/admins/:id', requireSuperAdmin, adminManagementController.update);
router.post('/admins/:id/reset-password', requireSuperAdmin, adminManagementController.resetPassword);
router.get('/admin-audit', requireSuperAdmin, adminManagementController.audit);

// ---- Dashboard ----
router.get('/dashboard/overview', adminDashboardController.getOverview);
router.get('/reports', adminReportsController.getReports);
router.get('/admin/settings', adminSettingsController.get);
router.put('/admin/settings', requireSuperAdmin, adminSettingsController.update);
router.get('/admin/payment-settings', adminPaymentSettingsController.get);
router.patch('/admin/payment-settings', requireSuperAdmin, adminPaymentSettingsController.update);
router.put('/admin/payment-settings/razorpay-key', requireSuperAdmin, adminPaymentSettingsController.updateKey);
router.get('/admin/payment-plans', adminPaymentSettingsController.listPlans);
router.post('/admin/payment-plans', requireSuperAdmin, adminPaymentSettingsController.createPlan);
router.patch('/admin/payment-plans/:id', requireSuperAdmin, adminPaymentSettingsController.updatePlan);
router.delete('/admin/payment-plans/:id', requireSuperAdmin, adminPaymentSettingsController.deletePlan);
router.get('/admin/moderation-settings', adminModerationSettingsController.get);
router.patch('/admin/moderation-settings', requireSuperAdmin, adminModerationSettingsController.update);
router.get('/moderation/reports', jobModerationController.listReports);
router.patch('/moderation/reports/:id', requireSuperAdmin, jobModerationController.reviewReport);
router.post('/admin/settings/logo', requireSuperAdmin, uploadProfilePicture.single('logo'), adminSettingsController.uploadLogo);
router.get('/admin/security/audit', adminSettingsController.getAudit);
router.get('/admin/security/audit/export', adminSettingsController.exportAudit);
router.patch('/admin/security/session-timeout', requireSuperAdmin, adminSettingsController.updateSessionTimeout);
router.get('/admin/notifications', async (req, res) => {
	try {
		const { listAdminNotifications } = require('../services/adminNotification.service');
		const items = await listAdminNotifications(req.admin.id);
		res.json({ items, unreadCount: items.filter((item) => !item.read).length });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});
router.patch('/admin/notifications/:id/read', async (req, res) => {
	try {
		const AdminNotification = require('../models/AdminNotification');
		const item = await AdminNotification.findOneAndUpdate(
			{ _id: req.params.id, admin: req.admin.id },
			{ read: true },
			{ new: true }
		);
		if (!item) return res.status(404).json({ error: 'Notification not found' });
		res.json(item);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});
router.patch('/admin/notifications/read-all', async (req, res) => {
	try {
		const AdminNotification = require('../models/AdminNotification');
		await AdminNotification.updateMany({ admin: req.admin.id, read: false }, { read: true });
		res.json({ message: 'All admin notifications marked as read' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});
router.delete('/admin/notifications', async (req, res) => {
	try {
		const AdminNotification = require('../models/AdminNotification');
		const result = await AdminNotification.deleteMany({ admin: req.admin.id });
		res.json({ message: 'Admin notifications cleared', deletedCount: result.deletedCount || 0 });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ---- User management ----
router.get('/users/candidates', adminUsersController.listCandidates);
router.get('/users/candidates/:id', adminUsersController.getCandidate);
router.get('/users/candidates/:id/applications', adminUsersController.getCandidateApplications);
router.get('/users/candidates/:id/analytics', adminUsersController.getCandidateAnalytics);
router.get('/users/candidates/:id/activity', adminUsersController.getCandidateActivity);
router.get('/users/candidates/:id/notes', adminUsersController.getCandidateNotes);
router.post('/users/candidates/:id/notes', adminUsersController.addCandidateNote);
router.get('/users/candidates/:id/resume/download', adminUsersController.downloadCandidateResume);
router.patch('/users/candidates/:id/verify', adminUsersController.setCandidateVerification);
router.post('/users/candidates/:id/send-password-reset', adminUsersController.sendCandidatePasswordReset);
router.get('/users/recruiters', adminUsersController.listRecruiters);
router.get('/users/recruiters/:id', adminUsersController.getRecruiter);
router.patch('/users/candidates/:id/status', adminUsersController.setCandidateStatus);
router.patch('/users/recruiters/:id/status', adminUsersController.setRecruiterStatus);

// ---- Recruiter account management ----
router.patch('/users/recruiters/:id/verify', adminUsersController.verifyRecruiter);
router.patch('/users/recruiters/:id/reject-verification', adminUsersController.rejectRecruiterVerification);
router.patch('/users/recruiters/:id/suspend', adminUsersController.suspendRecruiter);
router.patch('/users/recruiters/:id/activate', adminUsersController.activateRecruiter);
router.patch('/users/recruiters/:id/ban', adminUsersController.banRecruiter);
router.post('/users/recruiters/:id/reset-password', adminUsersController.resetRecruiterPassword);

// ---- Recruiter document management ----
router.patch('/users/recruiters/:id/documents/:docId', adminUsersController.updateDocumentStatus);

// ---- Recruiter admin notes ----
router.patch('/users/recruiters/:id/notes', adminUsersController.updateRecruiterNotes);

// ---- Recruiter wallet management ----
router.patch('/users/recruiters/:id/wallet/adjust', adminUsersController.adjustRecruiterWallet);

// ---- Recruiter analytics ----
router.get('/users/recruiters/:id/analytics', adminUsersController.getRecruiterAnalytics);

// ---- Payments monitoring ----
router.get('/payments/overview', adminPaymentsController.getOverview);
router.post('/payments/:id/refund', requireSuperAdmin, adminPaymentsController.refundPayment);
router.patch('/payments/refunds/:id/status', requireSuperAdmin, adminPaymentsController.updateRefundStatus);
router.get('/payments', adminPaymentsController.listPayments);
router.get('/payments/:id', adminPaymentsController.getPaymentById);

// ---- Hired badge approvals ----
router.get('/badges/pending', adminBadgeController.listPending);
router.patch('/badges/:offerLetterId/approve', adminBadgeController.approve);
router.patch('/badges/:offerLetterId/reject', adminBadgeController.reject);

// ---- Jobs management ----
router.get('/jobs', adminJobsController.listJobs);
router.get('/jobs/reopen-requests', adminJobsController.listReopenRequests);
router.get('/jobs/:id', adminJobsController.getJob);
router.patch('/jobs/:id/status', adminJobsController.updateJobStatus);
router.delete('/jobs/:id', adminJobsController.deleteJob);
router.get('/applications', adminJobsController.listApplications);
router.patch('/jobs/reopen-requests/:id/approve', adminJobsController.approveReopenRequest);
router.patch('/jobs/reopen-requests/:id/reject', adminJobsController.rejectReopenRequest);

// ---- Disputes ----
router.get('/disputes', adminDisputeController.list);
router.get('/disputes/:id', adminDisputeController.getById);
router.patch('/disputes/:id/resolve', adminDisputeController.resolve);

// ---- Superadmin-only example (e.g. creating another admin account, deleting data) ----
// router.post('/admins', requireSuperAdmin, someController.createAnotherAdmin);

module.exports = router;

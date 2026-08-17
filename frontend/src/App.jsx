import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import CandidateWorkspaceRoute from './routes/CandidateWorkspaceRoute';
import UniversalFooter from './components/UniversalFooter';

import Home from './pages/Home';
import IdRecovery from './pages/IdRecovery';
import RecruiterProfile from './pages/RecruiterProfile';
import CandidateProfile from './pages/candidate/Profile';
import CandidateJobSearch from './pages/candidate/JobSearch';
import CandidateJobDetail from './pages/candidate/JobDetail';
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateMessages from './pages/candidate/Messages';
import CandidateResumeMatch from './pages/candidate/ResumeMatch';
import RecommendedJobs from './pages/candidate/RecommendedJobs';
import AppliedJobs from './pages/candidate/AppliedJobs';
import SavedJobs from './pages/candidate/SavedJobs';
import CandidateSettings from './pages/candidate/Settings';

// import RecruiterRegister from './pages/recruiter/Register';
import RecruiterCompanyProfile from './pages/recruiter/CompanyProfile';
import RecruiterSettings from './pages/recruiter/Settings';
import RecruiterInvites from './pages/recruiter/Invites';
import RecruiterPostJob from './pages/recruiter/PostJob';
import RecruiterApplicants from './pages/recruiter/Applicants';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import RecruiterJobs from './pages/recruiter/Jobs';
import RecruiterResumeDownloadsPage from './pages/recruiter/ResumeDownloadsPage';
import RecruiterWallet from './pages/recruiter/Wallet';

// NOTE: There is no "/admin" route anywhere in this app, and no admin login
// link in the UI. The admin panel is a completely separate app (admin-panel/)
// deployed to its own subdomain. See PROJECT_README.md for details.

function AppLayout() {
  return (
    <div className=" flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <UniversalFooter />
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [restrictionModal, setRestrictionModal] = useState({ show: false, message: '', code: '' });

  // Listen for account restriction events (suspended/banned by admin)
  useEffect(() => {
    const handleAccountRestricted = (event) => {
      const { code, message } = event.detail || {};
      
      // Clear local storage immediately
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show modal
      setRestrictionModal({
        show: true,
        message: message || 'Your account has been restricted.',
        code: code || 'ACCOUNT_RESTRICTED',
      });
    };

    window.addEventListener('auth:account-restricted', handleAccountRestricted);

    return () => {
      window.removeEventListener('auth:account-restricted', handleAccountRestricted);
    };
  }, []);

  const handleRestrictionModalClose = () => {
    setRestrictionModal({ show: false, message: '', code: '' });
    // Full page reload to home/login - ensures all state is cleared
    window.location.href = '/';
  };

  return (
    <>
      {/* Account Restriction Modal */}
      {restrictionModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-[#F0E1D6] bg-white shadow-2xl">
            <div className="flex items-center gap-4 border-b border-[#F0E1D6] px-6 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF4EF]">
                <AlertTriangle className="h-6 w-6 text-[#C75560]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1D181A]">
                  {restrictionModal.code === 'ACCOUNT_BANNED' ? 'Account Banned' : 'Account Suspended'}
                </h2>
              </div>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm leading-relaxed text-[#3F3438]">
                {restrictionModal.message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#F0E1D6] px-6 py-4">
              <button
                onClick={handleRestrictionModalClose}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C75560] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#B42318] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/id-recovery" element={<IdRecovery />} />
        <Route path="/recruiter/:recruiterId" element={<RecruiterProfile />} />
        <Route
          path="/candidate/dashboard"
          element={<ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>}
        />
        <Route element={<ProtectedRoute role="candidate"><CandidateWorkspaceRoute /></ProtectedRoute>}>
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/jobs" element={<CandidateJobSearch />} />
          <Route path="/candidate/jobs/recommended" element={<RecommendedJobs />} />
          <Route path="/candidate/jobs/applied" element={<AppliedJobs />} />
          <Route path="/candidate/jobs/saved" element={<SavedJobs />} />
          <Route path="/candidate/jobs/:id" element={<CandidateJobDetail />} />
          <Route path="/candidate/resume-match" element={<CandidateResumeMatch />} />
          <Route path="/candidate/messages" element={<CandidateMessages />} />
          <Route path="/candidate/settings" element={<CandidateSettings />} />
        </Route>

        {/* <Route path="/recruiter/register" element={<RecruiterRegister />} /> */}
        <Route
          path="/recruiter/dashboard"
          element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/resume-downloads"
          element={<ProtectedRoute role="recruiter"><RecruiterResumeDownloadsPage /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/post-job"
          element={<ProtectedRoute role="recruiter"><RecruiterPostJob /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/jobs"
          element={<ProtectedRoute role="recruiter"><RecruiterJobs /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/applicants"
          element={<ProtectedRoute role="recruiter"><RecruiterApplicants /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/company-profile"
          element={<ProtectedRoute role="recruiter"><RecruiterCompanyProfile /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/settings"
          element={<ProtectedRoute role="recruiter"><RecruiterSettings /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/invites"
          element={<ProtectedRoute role="recruiter"><RecruiterInvites /></ProtectedRoute>}
        />
        <Route
          path="/recruiter/wallet"
          element={<ProtectedRoute role="recruiter"><RecruiterWallet /></ProtectedRoute>}
        />
      </Route>
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

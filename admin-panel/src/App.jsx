import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminProtectedRoute from './routes/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';

import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Recruiters from './pages/Recruiters';
import Candidates from './pages/Candidates';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import WalletPayments from './pages/WalletPayments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ManageUsers from './pages/ManageUsers';
import ManagePayments from './pages/ManagePayments';
import BadgeApprovals from './pages/BadgeApprovals';
import Disputes from './pages/Disputes';
import ReopenRequests from './pages/ReopenRequests';

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="recruiters" element={<Recruiters />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="applications" element={<Applications />} />
            <Route path="reopen-requests" element={<ReopenRequests />} />
            <Route path="wallet-payments" element={<WalletPayments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="payments" element={<ManagePayments />} />
            <Route path="badges" element={<BadgeApprovals />} />
            <Route path="disputes" element={<Disputes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

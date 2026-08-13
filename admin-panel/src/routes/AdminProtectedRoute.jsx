import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminProtectedRoute({ children, requireSuperAdmin = false }) {
  const { admin } = useAdminAuth();

  if (!admin) return <Navigate to="/login" replace />;
  if (requireSuperAdmin && admin.role !== 'superadmin') return <Navigate to="/" replace />;

  return children;
}

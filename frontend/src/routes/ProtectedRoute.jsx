import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Usage: <ProtectedRoute role="candidate"><Dashboard /></ProtectedRoute>
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const hasToken = Boolean(localStorage.getItem('token'));

  if (!user || !hasToken) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}

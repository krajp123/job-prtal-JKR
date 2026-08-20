import { createContext, useContext, useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!admin || admin.id) return;
    adminAxiosInstance.get('/auth/me')
      .then(({ data }) => {
        const hydrated = { id: data._id, name: data.name, email: data.email, role: data.role, profilePictureUrl: data.profilePictureUrl, sessionId: data.sessionId };
        localStorage.setItem('admin_user', JSON.stringify(hydrated));
        setAdmin(hydrated);
      })
      .catch(() => {
        // The API interceptor handles expired sessions.
      });
  }, [admin]);

  function login({ token, id, name, role, profilePictureUrl, sessionId }) {
    localStorage.setItem('admin_token', token);
    const adminData = { id, name, role, profilePictureUrl, sessionId };
    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  }

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  }

  function updateAdmin(patch) {
    setAdmin((current) => {
      const updated = { ...current, ...patch };
      localStorage.setItem('admin_user', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, updateAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

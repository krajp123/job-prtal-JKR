import { createContext, useContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../socket';

const AuthContext = createContext(null);

function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function getStoredUser() {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) {
    clearStoredSession();
    return null;
  }

  try {
    const tokenPayload = token.split('.')[1];
    const normalizedPayload = tokenPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const decodedPayload = atob(paddedPayload);
    const { exp } = JSON.parse(decodedPayload);

    if (typeof exp === 'number' && exp * 1000 <= Date.now()) {
      clearStoredSession();
      return null;
    }

    return JSON.parse(storedUser);
  } catch {
    clearStoredSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  // Reconnect the socket automatically on a page refresh if a token is
  // already present (i.e. the user was already logged in).
  useEffect(() => {
    if (localStorage.getItem('token')) connectSocket();

    function handleUnauthorized() {
      logout({ redirect: true });
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    try {
      const tokenPayload = token.split('.')[1];
      const normalizedPayload = tokenPayload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      const decodedPayload = atob(paddedPayload);
      const { exp } = JSON.parse(decodedPayload);

      if (typeof exp !== 'number') return undefined;

      const msUntilExpiry = exp * 1000 - Date.now();
      if (msUntilExpiry <= 0) {
        logout({ redirect: true });
        return undefined;
      }

      const timer = setTimeout(() => logout({ redirect: true }), msUntilExpiry);
      return () => clearTimeout(timer);
    } catch {
      logout({ redirect: true });
      return undefined;
    }
  }, [user]);

  function login({ token, role, ...rest }) {
    localStorage.setItem('token', token);
    const userData = { role, ...rest };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    connectSocket();
  }

  function logout({ redirect = false } = {}) {
    clearStoredSession();
    setUser(null);
    disconnectSocket();
    if (redirect) {
      window.location.replace('/');
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

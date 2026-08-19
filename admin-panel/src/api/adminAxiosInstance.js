import axios from 'axios';

// This instance ONLY talks to /admin-api. It stores its token under a
// different localStorage key than the public frontend, so even if someone
// opened both apps in the same browser, the tokens never mix.
const adminApiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:5000/admin-api';
if (!import.meta.env.VITE_ADMIN_API_BASE_URL) {
  console.warn('VITE_ADMIN_API_BASE_URL is not defined. Falling back to', adminApiBaseUrl);
}

const adminAxiosInstance = axios.create({
  baseURL: adminApiBaseUrl,
});

adminAxiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminAxiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }

    // Check if account was suspended or banned
    if (err.response?.status === 403) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'ACCOUNT_SUSPENDED' || errorCode === 'ACCOUNT_BANNED') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        const message = err.response?.data?.error || 'Your account has been restricted.';
        alert(message);
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default adminAxiosInstance;

import axios from 'axios';

// This instance ONLY talks to the public /api base.
// The public frontend bundle never references /admin-api at all -
// there is nothing to reverse-engineer or find in devtools.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. http://localhost:5000/api
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthenticatedRequest = Boolean(error.config?.headers?.Authorization);

    if (error.response?.status === 401 && isAuthenticatedRequest) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Separate instance for file uploads with 120s timeout and 50MB limits
export const uploadApi = axios.create({
  baseURL: '/api',
  timeout: 120000,
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
});

const attachToken = (config) => {
  const token = localStorage.getItem('supabase_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachToken, (error) => Promise.reject(error));
uploadApi.interceptors.request.use(attachToken, (error) => Promise.reject(error));

// Track recent toasts to avoid spamming the screen
let lastToastTime = 0;
const showThrottledToast = (msg, id) => {
  const now = Date.now();
  if (now - lastToastTime > 3000) {
    lastToastTime = now;
    toast.error(msg, { id: id || 'server-error' });
  }
};

const handleError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;

    if (status === 401) {
      localStorage.removeItem('supabase_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      showThrottledToast(detail || 'Access restricted to administrators', 'access-denied');
    } else if (status === 413) {
      toast.error(detail || 'File is larger than the 50MB limit');
    } else if (status >= 500) {
      showThrottledToast(detail || 'Service is initializing. Retrying in a moment...', 'server-500');
    }
  } else if (error.code === 'ECONNABORTED') {
    showThrottledToast('Connection timed out. Please try again.', 'timeout');
  } else if (!error.response) {
    showThrottledToast('Connecting to backend server...', 'connecting');
  }
  return Promise.reject(error);
};

api.interceptors.response.use((res) => res, handleError);
uploadApi.interceptors.response.use((res) => res, handleError);

export default api;

import axios from 'axios';

// Central Axios client configured with cookies for secure JWT refresh
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Necessary to send/receive HttpOnly refresh cookies
  timeout: 15000,
});

// Attach access token to headers if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reportsaathi_access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh access token on 401 Unauthorized
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth endpoints
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login/') &&
      !originalRequest.url.includes('/auth/register/') &&
      !originalRequest.url.includes('/auth/token/refresh/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send refresh request (browser automatically attaches HttpOnly cookie)
        const refreshResponse = await axios.post(
          '/api/auth/token/refresh/',
          {},
          { withCredentials: true }
        );
        const newAccess = refreshResponse.data.access;
        localStorage.setItem('reportsaathi_access', newAccess);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('reportsaathi_access');
        window.dispatchEvent(new Event('reportsaathi_session_expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Health API
export const fetchHealthStatus = async () => {
  const response = await apiClient.get('/health/');
  return response.data;
};

// Auth APIs
export const authApi = {
  register: async (data) => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login/', credentials);
    return response.data;
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await apiClient.patch('/auth/profile/', data);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout/', {});
    return response.data;
  },
};

// Documents APIs
export const documentsApi = {
  list: async (category = '') => {
    const url = category ? `/documents/?category=${encodeURIComponent(category)}` : '/documents/';
    const response = await apiClient.get(url);
    return response.data;
  },
  upload: async (formData) => {
    const response = await apiClient.post('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  get: async (id) => {
    const response = await apiClient.get(`/documents/${id}/`);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/documents/${id}/`);
    return response.data;
  },
  extract: async (id) => {
    const response = await apiClient.post(`/documents/${id}/extract/`);
    return response.data;
  },
  getExtraction: async (id) => {
    const response = await apiClient.get(`/documents/${id}/extraction/`);
    return response.data;
  },
  verifyItem: async (id, payload = {}) => {
    const response = await apiClient.patch(`/documents/${id}/verify/`, payload);
    return response.data;
  },
  getDownloadUrl: (id) => `/api/documents/${id}/download/`,
  getPreviewUrl: (id) => `/api/documents/${id}/preview/`,
  getPreviewBlob: async (id) => {
    const response = await apiClient.get(`/documents/${id}/preview/`, {
      responseType: 'blob',
    });
    return response.data;
  },
  explain: async (id, payload = { consent_given: true, language: 'en' }) => {
    const response = await apiClient.post(`/documents/${id}/explain/`, payload);
    return response.data;
  },
  getExplanation: async (id) => {
    const response = await apiClient.get(`/documents/${id}/explanation/`);
    return response.data;
  },
};

export default apiClient;

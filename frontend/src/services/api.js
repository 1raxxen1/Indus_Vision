import axios from 'axios';

// Create a custom Axios instance — all API calls use this, not plain axios
const api = axios.create({
  // Reads from your .env file (you'll create this next)
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds — important for AI image processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST interceptor — runs before every API call
// Automatically attaches the JWT token so you don't add it manually everywhere
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE interceptor — runs after every API response
// If the server returns 401 (token expired), redirect to login automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const scanService = {
  processImage: (file, imageName) => {
    const formData = new FormData();
    formData.append('image', file);
    if (imageName) {
      formData.append('image_name', imageName);
    }
    return api.post('/posts/api/process-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  processImages: (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return api.post('/posts/api/process-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
  },
  getResult: (resultId) => api.get(`/posts/api/results/${resultId}/`),
};

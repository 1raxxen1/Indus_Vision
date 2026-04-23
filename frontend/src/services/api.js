// src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL:         'http://localhost:8000/posts/api',
  timeout:         120000,  // 2 min — Llama pipeline can be slow
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
})

// Remove Content-Type for FormData so browser sets multipart boundary
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status
    const message = error.response?.data?.error
                 || error.response?.data?.message
                 || error.message
                 || 'Request failed'
    return Promise.reject({ status, message, raw: error })
  }
)

export default api
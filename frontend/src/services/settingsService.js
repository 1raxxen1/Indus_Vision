import api from './api'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const settingsService = {
  getUserSettings: (username = '') =>
    axios.get(`${BASE_URL}/accounts/profile/`, { params: { username }, withCredentials: true }).then(r => r.data),

  getAdminSettings: () => api.get('/admin/'),

  updateProfile: (data) =>
    axios.put(`${BASE_URL}/accounts/profile/`, data, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    }).then(r => r.data),

  updatePassword: (data) =>
    axios.post(`${BASE_URL}/accounts/password/`, data, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    }).then(r => r.data),
}

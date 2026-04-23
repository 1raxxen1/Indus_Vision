// settingsService.js
// GET /posts/api/settings/ and GET /posts/api/admin/

import api from './api'

export const settingsService = {
  getUserSettings:  () => api.get('/settings/'),
  getAdminSettings: () => api.get('/admin/'),

  // These will be POST/PUT when you add write endpoints
  // updateProfile:    (data) => api.put('/settings/', data),
  // updatePassword:   (data) => api.post('/settings/password/', data),
}
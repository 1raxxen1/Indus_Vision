// authService.js
// Handles login and session management.
// Your backend uses GET /posts/api/login/ for activity summary.
// We add a POST to /posts/login/ for actual authentication.

import api from './api'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const authService = {

  // ── Get login activity summary (your existing endpoint) ──
  // Returns recent login stats for the dashboard
  getLoginSummary: () =>
    api.get('/login/'),

  // ── Actual login (POST to Django auth) ──
  // If your Django uses DRF Token Auth:
  //   pip install djangorestframework
  //   Add 'rest_framework.authtoken' to INSTALLED_APPS
  //   URL: path('api-token-auth/', obtain_auth_token)
  login: async (email, password) => {
    // Use the custom authenticate endpoint
    const res = await axios.post(
      `${BASE_URL}/posts/authenticate/`,
      { username: email, password },
      { headers: { 'Content-Type': 'application/json' } }
    )
    return res.data  // returns { success: true, user: {...} }
  },

  // ── Session-based login (Django's built-in) ──
  // Use this if you're using Django's default session auth
  loginWithSession: async (username, password) => {
    // First get CSRF token
    await axios.get(`${BASE_URL}/accounts/`, { withCredentials: true })
    const csrf = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1]

    return axios.post(
      `${BASE_URL}/posts/login/`,
      { username, password },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken':  csrf || '',
        },
      }
    )
  },
}
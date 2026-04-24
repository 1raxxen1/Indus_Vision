import api from './api'
import axios from 'axios'

const explicitHost = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const apiBase = import.meta.env.VITE_API_BASE_URL || ''
const derivedHost = apiBase.startsWith('http')
  ? apiBase.replace(/\/posts\/api\/?$/, '')
  : ''
const isLocalDev = import.meta.env.DEV
  && typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const BASE_URL = explicitHost || derivedHost || (isLocalDev ? 'http://localhost:8000' : '')

export const authService = {
  getLoginSummary: () => api.get('/login/'),

  login: async (email, password) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/accounts/login/`,
        { email, username: email, password },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      )
      return res.data
    } catch {
      // Backward-compatible fallback if server is still using legacy posts auth endpoint
      const res = await axios.post(
        `${BASE_URL}/posts/authenticate/`,
        { username: email, password },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
      )
      return res.data
    }
  },

  register: async ({ name, email, password }) => {
    const username = name?.trim() || email.split('@')[0]
    const res = await axios.post(
      `${BASE_URL}/accounts/register/`,
      { username, email, password },
      { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
    )
    return res.data
  },

  loginWithSession: async (username, password) => {
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
          'X-CSRFToken': csrf || '',
        },
      }
    )
  },
}

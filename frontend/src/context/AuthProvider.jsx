import { useState } from 'react'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    // On app start, check if user was previously logged in
    try {
      const token     = localStorage.getItem('access_token')
      const savedUser = localStorage.getItem('user')
      if (token && savedUser) return JSON.parse(savedUser)
    } catch {
      // If JSON is corrupted, clear it
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    }
    return null // No saved session → user must log in
  })

  const login = (userData, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
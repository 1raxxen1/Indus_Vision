import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'  // ← points to the .js file

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
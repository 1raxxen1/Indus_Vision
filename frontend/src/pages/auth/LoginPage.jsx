import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

import {
  Eye, EyeOff, Mail, Lock, User,
  ArrowRight, Package, BarChart2, ScanLine,
} from 'lucide-react'


// ── Input Component ───────────────────
function FormInput({ icon: Icon, type = 'text', placeholder, value, onChange, error, rightElement }) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white
        ${error ? 'border-red-300' : 'border-gray-200'}`}>
        <Icon size={16} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 text-sm outline-none"
        />
        {rightElement}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}


// ── Login Page ────────────────────────
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)


  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }


  function validate() {
    const e = {}

    if (mode === 'register' && !form.name) {
      e.name = 'Name required'
    }

    if (!form.email) {
      e.email = 'Email required'
    }

    if (!form.password) {
      e.password = 'Password required'
    }

    if (mode === 'register' && form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }


  // 🔥 FINAL AUTH LOGIC
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    try {
      if (mode === 'register') {
        const registerRes = await authService.register({
          name: form.name,
          email: form.email,
          password: form.password,
        })

        if (!registerRes.success) {
          throw new Error(registerRes.error || 'Registration failed')
        }

        toast.success('Registration successful. Please log in.')
        setMode('login')
        setForm(prev => ({ ...prev, confirmPassword: '' }))
        return
      }

      const response = await authService.login(
        form.email,
        form.password
      )

      if (response.success) {
        const userData = {
          id: response.user.id,
          name: response.user.username,
          email: response.user.email,
          role: 'Operator',
        }

        login(userData, 'authenticated')

        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        throw new Error(response.error || 'Login failed')
      }

    } catch {
      if (mode === 'register') {
        setErrors({ general: 'Registration failed. Try a different email/username.' })
        toast.error('Registration failed')
      } else {
        setErrors({ general: 'Invalid email or password' })
        toast.error('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">

      <div className="w-full max-w-sm">

        <h2 className="text-xl font-bold mb-4">
          {mode === 'login' ? 'Login' : 'Register'}
        </h2>

        {errors.general && (
          <p className="text-red-500 text-sm">{errors.general}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {mode === 'register' && (
            <FormInput
              icon={User}
              placeholder="Name"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              error={errors.name}
            />
          )}

          <FormInput
            icon={Mail}
            placeholder="Email"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            error={errors.email}
          />

          <FormInput
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={e => setField('password', e.target.value)}
            error={errors.password}
            rightElement={
              <button type="button" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {mode === 'register' && (
            <FormInput
              icon={Lock}
              type="password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={e => setField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-xl"
          >
            {loading ? 'Loading...' : 'Submit'}
          </button>
        </form>

        <p className="text-sm mt-4">
          {mode === 'login'
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-orange-600 ml-1"
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>

      </div>
    </div>
  )
}
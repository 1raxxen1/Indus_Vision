import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Mail, Lock, User,
  ArrowRight, Package, BarChart2, ScanLine,
} from 'lucide-react'

// ── Small reusable input with icon ───────────────────────────────
function FormInput({ icon: Icon, type = 'text', placeholder, value, onChange, error, rightElement }) {
  return (
    <div className="space-y-1">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border bg-white
        transition-all duration-200
        ${error
          ? 'border-red-300 ring-2 ring-red-100'
          : 'border-gray-200 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100'
        }
      `}>
        <Icon size={16} className={error ? 'text-red-400' : 'text-gray-400'} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
        />
        {rightElement}
      </div>
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  )
}

// ── Feature pill shown on the left panel ─────────────────────────
function FeaturePill({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
      <div className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-orange-200" />
      </div>
      <span className="text-sm text-blue-100">{text}</span>
    </div>
  )
}

// ── Main Login/Register page ──────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  // Toggle between 'login' and 'register'
  const [mode, setMode] = useState('login')

  // Form fields
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })

  // Validation errors
  const [errors, setErrors] = useState({})

  // Loading + password visibility
  const [loading, setLoading]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Update a single field, clear its error
  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  // ── Validation ───────────────────────────────────────────────
  function validate() {
    const e = {}

    if (mode === 'register' && !form.name.trim()) {
      e.name = 'Full name is required'
    }
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }
    if (!form.password) {
      e.password = 'Password is required'
    } else if (form.password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }
    if (mode === 'register' && form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match'
    }

    setErrors(e)
    return Object.keys(e).length === 0 // true = valid
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    try {
      // ── TEMPORARY: mock auth until Django backend is connected ──
      // Replace this block with your real API call later:
      //
      //   const res = await authService.login({ email: form.email, password: form.password })
      //   login(res.data.user, res.data.access_token)
      //
      await new Promise(r => setTimeout(r, 1200)) // simulate network delay

      const mockUser  = {
        name:  mode === 'register' ? form.name : 'Atharva Tanpure',
        email: form.email,
        role:  'Admin',
      }
      const mockToken = 'mock-jwt-token-12345'

      login(mockUser, mockToken)
      navigate('/dashboard')

    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Switch mode and reset everything
  function switchMode(newMode) {
    setMode(newMode)
    setForm({ name: '', email: '', password: '', confirmPassword: '' })
    setErrors({})
    setShowPassword(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — branding ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-navy-800 flex-col justify-between p-12">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">IA</span>
          </div>
          <span className="text-white font-semibold text-lg">InventoryAI</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Industrial inventory,<br />
              <span className="text-orange-400">powered by AI.</span>
            </h1>
            <p className="text-navy-300 text-base leading-relaxed max-w-sm">
              Upload images of components. Get instant identification,
              OCR extraction, and real-time Indian market pricing.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            <FeaturePill icon={ScanLine}  text="AI object detection with LLAMA vision" />
            <FeaturePill icon={Package}   text="Automated inventory management" />
            <FeaturePill icon={BarChart2} text="Real-time pricing & analytics" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-navy-500 text-xs">
          Bharati Vidyapeeth University · Electrical Engineering · 2025–26
        </p>
      </div>

      {/* ── RIGHT PANEL — auth form ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo — only on small screens */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">IA</span>
            </div>
            <span className="text-navy-800 font-semibold">InventoryAI</span>
          </div>

          {/* Mode toggle tabs */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 mb-7 shadow-sm">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`
                  flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${mode === m
                    ? 'bg-navy-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-navy-800">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access your inventory dashboard.'
                : 'Set up your account to get started.'}
            </p>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>

            {/* Name field — register only */}
            {mode === 'register' && (
              <FormInput
                icon={User}
                placeholder="Full name"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                error={errors.name}
              />
            )}

            {/* Email */}
            <FormInput
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              error={errors.email}
            />

            {/* Password */}
            <FormInput
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              error={errors.password}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <FormInput
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
              />
            )}

            {/* Forgot password — login only */}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-2
                bg-orange-600 hover:bg-orange-700 active:scale-[0.98]
                text-white text-sm font-medium
                py-3 rounded-xl mt-1
                transition-all duration-200
                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Bottom switch */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-orange-600 font-medium hover:text-orange-700"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
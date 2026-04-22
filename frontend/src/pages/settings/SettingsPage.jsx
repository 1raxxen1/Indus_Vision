import { useState }  from 'react'
import { useAuth }   from '../../hooks/useAuth'
import {
  User, Bell, Shield,
  Link, Save, Eye, EyeOff,
  CheckCircle,
} from 'lucide-react'

// ── Reusable section wrapper ──────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="text-sm font-semibold text-navy-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

// ── Reusable field row ────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <div className="sm:w-44 flex-shrink-0">
        <p className="text-sm font-medium text-navy-800">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200
                 ${checked ? 'bg-orange-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full
                        shadow-sm transition-transform duration-200
                        ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export function SettingsPage() {
  const { user }    = useAuth()

  // ── Profile state ─────────────────────────────────────────────
  const [name,     setName]     = useState(user?.name  ?? '')
  const [email,    setEmail]    = useState(user?.email ?? '')

  // ── Password state ────────────────────────────────────────────
  const [currPwd,  setCurrPwd]  = useState('')
  const [newPwd,   setNewPwd]   = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  // ── Notification toggles ──────────────────────────────────────
  const [notifs, setNotifs] = useState({
    scanComplete:  true,
    lowStock:      true,
    newReport:     false,
    weeklyDigest:  true,
  })

  // ── API config ────────────────────────────────────────────────
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api')

  // ── Save feedback ─────────────────────────────────────────────
  const [saved, setSaved]   = useState('')

  function handleSave(section) {
    setSaved(section)
    setTimeout(() => setSaved(''), 2500)
  }

  const inputCls = `w-full text-sm bg-white border border-surface-border
                    rounded-xl px-3 py-2.5 outline-none text-navy-800
                    focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                    transition-all duration-200`

  const saveBtnCls = (section) => `
    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
    transition-all duration-200 active:scale-95
    ${saved === section
      ? 'bg-green-500 text-white'
      : 'bg-orange-600 hover:bg-orange-700 text-white'}
  `

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account, notifications, and app configuration
        </p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <Section
        title="Profile"
        subtitle="Your personal information and display settings"
      >
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-navy-600 border-2
                          border-navy-500 flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-800">{name || 'Your name'}</p>
            <p className="text-xs text-gray-400">{user?.role ?? 'Operator'}</p>
            <button className="text-xs text-orange-600 hover:text-orange-700
                               font-medium mt-1 transition-colors">
              Change photo
            </button>
          </div>
        </div>

        <hr className="border-surface-border" />

        <Field label="Full name">
          <input className={inputCls} value={name}
                 onChange={e => setName(e.target.value)} />
        </Field>

        <Field label="Email address">
          <input className={inputCls} type="email" value={email}
                 onChange={e => setEmail(e.target.value)} />
        </Field>

        <Field label="Role">
          <input className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                 value={user?.role ?? 'Operator'} readOnly />
        </Field>

        <div className="flex justify-end pt-1">
          <button onClick={() => handleSave('profile')} className={saveBtnCls('profile')}>
            {saved === 'profile'
              ? <><CheckCircle size={14} /> Saved!</>
              : <><Save size={14} /> Save profile</>}
          </button>
        </div>
      </Section>

      {/* ── Password ─────────────────────────────────────────────── */}
      <Section title="Password" subtitle="Update your login credentials">
        <Field label="Current password">
          <div className="relative">
            <input
              className={inputCls}
              type={showPwd ? 'text' : 'password'}
              placeholder="Enter current password"
              value={currPwd}
              onChange={e => setCurrPwd(e.target.value)}
            />
            <button
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <Field label="New password">
          <input
            className={inputCls}
            type={showPwd ? 'text' : 'password'}
            placeholder="Minimum 6 characters"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
          />
        </Field>

        <div className="flex justify-end pt-1">
          <button onClick={() => handleSave('password')} className={saveBtnCls('password')}>
            {saved === 'password'
              ? <><CheckCircle size={14} /> Saved!</>
              : <><Save size={14} /> Update password</>}
          </button>
        </div>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────── */}
      <Section title="Notifications" subtitle="Choose what alerts you receive">
        {[
          { key: 'scanComplete', label: 'Scan completed',  hint: 'Alert when AI analysis finishes'       },
          { key: 'lowStock',     label: 'Low stock alert', hint: 'Alert when items fall below threshold'  },
          { key: 'newReport',    label: 'Report ready',    hint: 'Alert when a report is generated'       },
          { key: 'weeklyDigest', label: 'Weekly digest',   hint: 'Summary email every Monday morning'     },
        ].map(n => (
          <Field key={n.key} label={n.label} hint={n.hint}>
            <Toggle
              checked={notifs[n.key]}
              onChange={val => setNotifs(prev => ({ ...prev, [n.key]: val }))}
            />
          </Field>
        ))}
      </Section>

      {/* ── API configuration ─────────────────────────────────────── */}
      <Section
        title="API configuration"
        subtitle="Connect to your Django REST backend"
      >
        <Field label="Backend URL" hint="Your Django API base URL">
          <input
            className={inputCls}
            value={apiUrl}
            onChange={e => setApiUrl(e.target.value)}
            placeholder="http://localhost:8000/api"
          />
        </Field>

        <Field label="API status">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-xs text-amber-600 font-medium">
              Not connected — mock mode active
            </span>
          </div>
        </Field>

        <div className="flex justify-end pt-1">
          <button onClick={() => handleSave('api')} className={saveBtnCls('api')}>
            {saved === 'api'
              ? <><CheckCircle size={14} /> Saved!</>
              : <><Save size={14} /> Save API config</>}
          </button>
        </div>
      </Section>

      {/* ── Danger zone ───────────────────────────────────────────── */}
      <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-xs text-red-500 mt-0.5">
            These actions are irreversible
          </p>
        </div>
        <div className="px-5 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy-800">Clear all scan history</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Permanently delete all scan records
            </p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-red-200
                             bg-red-50 text-red-600 text-sm font-medium
                             hover:bg-red-100 transition-all duration-150">
            Clear history
          </button>
        </div>
      </div>
    </div>
  )
}
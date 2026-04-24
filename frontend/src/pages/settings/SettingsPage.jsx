import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

import { useApi } from '../../hooks/useApi'
import { useMutation } from '../../hooks/useMutation'
import { settingsService } from '../../services/settingsService'

import {
  Save, CheckCircle, Eye, EyeOff,
} from 'lucide-react'


// ── Section wrapper ───────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white border rounded-xl">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}


// ═══════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════
export function SettingsPage() {
  const { user } = useAuth()

  // ── Fetch settings ──────────────────
  const { data, loading, error, refetch } = useApi(
    () => settingsService.getUserSettings(user?.name || '')
  )

  // ── Form state ──────────────────────
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [currPwd, setCurrPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [saved, setSaved] = useState('')


  // ── Populate form from API ──────────
  useEffect(() => {
    if (data) {
      setName(data.name ?? user?.name ?? '')
      setEmail(data.email ?? user?.email ?? '')
    }
  }, [data, user])


  // ── Mutations ───────────────────────
  const { mutate: saveProfile, loading: savingProfile } = useMutation(
    (payload) => settingsService.updateProfile(payload)
  )

  const { mutate: updatePassword, loading: savingPassword } = useMutation(
    (payload) => settingsService.updatePassword(payload)
  )


  // ── Handlers ────────────────────────
  function handleProfileSave() {
    saveProfile(
      { name, email },
      {
        onSuccess: () => {
          setSaved('profile')
          setTimeout(() => setSaved(''), 2000)
        },
      }
    )
  }

  function handlePasswordSave() {
    if (!currPwd || !newPwd) return

    updatePassword(
      { email, current_password: currPwd, new_password: newPwd },
      {
        onSuccess: () => {
          setSaved('password')
          setCurrPwd('')
          setNewPwd('')
          setTimeout(() => setSaved(''), 2000)
        },
      }
    )
  }


  if (loading) return <div>Loading settings...</div>
  if (error) return <div>Error loading settings</div>


  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>


      {/* Profile */}
      <Section title="Profile">

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
        />

        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
        />

        <button onClick={handleProfileSave}>
          {saved === 'profile'
            ? <><CheckCircle size={14} /> Saved</>
            : <><Save size={14} /> Save</>}
        </button>

      </Section>


      {/* Password */}
      <Section title="Password">

        <input
          type={showPwd ? 'text' : 'password'}
          value={currPwd}
          onChange={e => setCurrPwd(e.target.value)}
          placeholder="Current password"
        />

        <input
          type={showPwd ? 'text' : 'password'}
          value={newPwd}
          onChange={e => setNewPwd(e.target.value)}
          placeholder="New password"
        />

        <button onClick={() => setShowPwd(v => !v)}>
          {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button onClick={handlePasswordSave}>
          {saved === 'password'
            ? <><CheckCircle size={14} /> Updated</>
            : <><Save size={14} /> Update</>}
        </button>

      </Section>

    </div>
  )
}
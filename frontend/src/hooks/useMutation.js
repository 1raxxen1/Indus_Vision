// useMutation.js
// For POST/PUT/DELETE calls that are triggered by user actions
// (button clicks, form submits) — not on page load.

import { useState } from 'react'

export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [data,    setData]    = useState(null)

  async function mutate(payload) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn(payload)
      setData(res.data)
      return res.data  // so callers can use the result immediately
    } catch (err) {
      setError(err.message || 'Action failed')
      throw err        // re-throw so caller can catch too
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error, data }
}
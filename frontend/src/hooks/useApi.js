// useApi.js
// Generic hook that handles loading, error, and data state
// for any API call. Use this in every page.

import { useState, useEffect, useCallback } from 'react'

export function useApi(apiFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn()
      const payload =
        res && typeof res === 'object' && 'data' in res
          ? res.data
          : (res ?? null)
      setData(payload)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  // expose refetch so components can manually re-trigger
  return { data, loading, error, refetch: fetch }
}
